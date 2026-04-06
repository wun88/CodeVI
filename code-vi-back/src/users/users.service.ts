import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from './entities/user.entity';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { CreateGoogleUserRequestDto } from './dto/create-google-user-request.dto';
import { createBuildReportDto } from './dto/create-build-report.dto'
import { UserStatus } from './entities/user-status.enum';
import { UserRole } from './entities/user-role.enum';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { AstSnapshot } from 'src/ast-relational/entity/ast-snapshot.entity';
import { AstRelationalService } from 'src/ast-relational/ast-relational.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TeamProject)
    private teamProjectRepository: Repository<TeamProject>,
    private readonly astRelationalService: AstRelationalService,
    private readonly dataSource: DataSource,
  ) { }

  // CREATE
  async createUser(createUserRequestDto: CreateUserRequestDto): Promise<void> {
    this.logger.verbose(
      `Visitor is creating a new account with title: ${createUserRequestDto.email}`,
    );

    const { username, password, passwordConfirm, email, role } =
      createUserRequestDto;
    if (!username || !password || !email || !role) {
      throw new BadRequestException('Something went wrong.');
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException('Something went wrong.');
    }
    await this.checkEmailExist(email);
    const hashedPassword = await this.hashPassword(password);

    const newUser = this.usersRepository.create({
      username,
      password: hashedPassword,
      email,
      role,
    });
    await this.usersRepository.save(newUser);

    this.logger.verbose(
      `New account email with ${newUser.email} created Successfully`,
    );
  }

  // CREATE - Google User
  async createUserByGoogle(
    createGoogleUserRequestDto: CreateGoogleUserRequestDto,
  ): Promise<void> {
    this.logger.verbose(
      `Creating a new Google account with email: ${createGoogleUserRequestDto.email}`,
    );
    const { username, email, role } = createGoogleUserRequestDto;
    if (!username || !email || !role) {
      this.logger.error('Required fields missing for Google user creation.');
      throw new BadRequestException(
        'Username, email, and role must be provided for Google login.',
      );
    }
    try {
      await this.checkEmailExist(email);
      const tempPassword = uuidv4();
      const hashedPassword = await this.hashPassword(tempPassword);
      const newUser = this.usersRepository.create({
        username,
        password: hashedPassword,
        email,
        role,
      });
      const savedUser = await this.usersRepository.save(newUser);
      this.logger.verbose(
        `New Google account created successfully: ${savedUser.email} (ID: ${savedUser.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating Google user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // READ - All users
  async getAllUsers(): Promise<User[]> {
    this.logger.verbose('Retrieving all Users');

    const foundUsers = await this.usersRepository.find({
      relations: [
        'classRegistrations',
        'classRegistrations.class',
        'productions',
      ],
      order: { id: 'DESC' },
    });

    this.logger.verbose(
      `All users retrieved successfully: ${JSON.stringify(foundUsers)}`,
    );
    return foundUsers;
  }

  // READ - All users pagenated
  async getAllUsersPagenated(
    page: number,
    limit: number,
  ): Promise<{ users: User[]; total: number }> {
    this.logger.verbose('Retrieving all Users with pagination');

    try {
      const [users, total] = await this.usersRepository.findAndCount({
        relations: [
          'classRegistrations',
          'classRegistrations.class',
          'productions',
        ],
        skip: (page - 1) * limit,
        take: limit,
        order: { id: 'DESC' },
      });

      this.logger.verbose(
        `All users retrieved successfully: ${JSON.stringify(users)}`,
      );
      return { users, total };
    } catch (error) {
      throw error;
    }
  }

  // READ - by id
  async getUserById(id: number): Promise<User> {
    this.logger.verbose(`Retrieving a user by id: ${id}`);

    const foundUser = await this.usersRepository.findOne({
      relations: [
        'classRegistrations',
        'classRegistrations.class',
        'productions',
      ],
      where: { id },
    });
    if (!foundUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.verbose(`Retrieved a user by ${id} details Successfully`);
    return foundUser;
  }

  // READ - by email
  async getUserByEmail(email: string): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    return existingUser;
  }

  async remove(id: number): Promise<void> {
    const userId = await this.getUserById(id);
    await this.usersRepository.remove(userId);
  }

  // UPDATE - by id
  async updateUserById(
    id: number,
    updateUserRequestDto: UpdateUserRequestDto,
  ): Promise<void> {
    this.logger.verbose(`Updating a user by id: ${id}`);

    const foundUser = await this.getUserById(id);
    const { username, password, role } = updateUserRequestDto;
    if (!username || !password || !role) {
      throw new BadRequestException('Title and contents must be provided');
    }
    foundUser.username = username;
    foundUser.password = password;
    foundUser.role = role;

    await this.usersRepository.save(foundUser);

    this.logger.verbose(`Updated an user by ${id} Successfully`);
  }

  // Existing Checker
  async checkEmailExist(email: string): Promise<void> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
  }

  // Hashing password
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);
  }

  // BUILD REPORT HANDLING
  async createBuildReport(dto: createBuildReportDto): Promise<any> {
    const { jenkinsJobName, jenkinsMetadata, collaborators, astNodes } = dto;

    const project = await this.teamProjectRepository.findOne({
      where: { JenkinsJobName: jenkinsJobName },
      relations: ['users'],
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${jenkinsJobName}`);
    }

    // Duplicate Check
    const existingSnapshot = await this.dataSource.getRepository(AstSnapshot).findOne({
      where: {
        teamProjectId: project.id,
        buildNumber: jenkinsMetadata.buildNumber,
      },
    });

    if (existingSnapshot) {
      this.logger.warn(`Snapshot for build ${jenkinsMetadata.buildNumber} already exists. Skipping.`);
      return { status: 'skipped', message: 'Duplicate build number', snapshotId: existingSnapshot.id };
    }

    let savedSnapshotId: number = 0;
    await this.dataSource.transaction(async (manager) => {
      // 1. Sync Collaborators
      const syncedUsers = await this.syncCollaborators(manager, collaborators);

      // Link synced users to the project if not already linked
      const existingUserIds = project.users.map(u => u.id);
      const newUsersToLink = syncedUsers.filter(u => !existingUserIds.includes(u.id));

      if (newUsersToLink.length > 0) {
        project.users.push(...newUsersToLink);
        await manager.save(project);
      }

      // 2. Create Snapshot (Hierarchical)
      const snapshot = manager.create(AstSnapshot, {
        teamProjectId: project.id,
        buildNumber: jenkinsMetadata.buildNumber,
        buildUrl: jenkinsMetadata.buildUrl,
        wholeJson: astNodes,
      });
      const savedSnapshot = await manager.save(snapshot);
      savedSnapshotId = savedSnapshot.id;

      // 3. Process AST Nodes (Relational)
      for (const node of astNodes) {
        await this.astRelationalService.processNode(manager, node, savedSnapshot.id, null);
      }
    });

    return { status: 'success', snapshotId: savedSnapshotId };
  }

  private async syncCollaborators(manager: any, collaborators: any[]): Promise<User[]> {
    const syncedUsers: User[] = [];

    for (const coll of collaborators) {
      let user = await manager.findOne(User, { where: { githubUid: coll.githubUid } });

      if (!user) {
        // Create pre-registered user
        user = manager.create(User, {
          githubUid: coll.githubUid,
          username: coll.login,
          status: UserStatus.PENDING,
          role: UserRole.STUDENT, // Default role
          // email and password can be null (modified in entity)
        });
        user = await manager.save(user);
        this.logger.log(`Created pending user for GitHub UID: ${coll.githubUid} (${coll.login})`);
      }

      syncedUsers.push(user);
    }

    return syncedUsers;
  }
}
