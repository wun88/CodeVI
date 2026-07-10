import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from './entities/user.entity';
import { CreateUserDto, CreateUserWithAstAndBuildDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { CreateGoogleUserRequestDto } from './dto/create-google-user-request.dto';
import { CreateGithubUserRequestDto } from './dto/create-github-user-request.dto';
import { CreateKakaoUserRequestDto } from './dto/create-kakao-user-request.dto';
import { CreateNaverUserRequestDto } from './dto/create-naver-user-request.dto';
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
    private readonly astRelationalService: AstRelationalService,
    private readonly dataSource: DataSource,
  ) { }

  // CREATE
  async createUser(createUserRequestDto: CreateUserDto): Promise<void> {
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
  ): Promise<User> {
    this.logger.verbose(
      `Creating a new Google account with email: ${createGoogleUserRequestDto.email}`,
    );
    const { googleUid, username, email, role } = createGoogleUserRequestDto;
    if (!googleUid || !username || !email || !role) {
      this.logger.error('Required fields missing for Google user creation.');
      throw new BadRequestException(
        'Google UID, username, email, and role must be provided for Google login.',
      );
    }
    try {
      await this.checkEmailExist(email);
      const tempPassword = uuidv4();
      const hashedPassword = await this.hashPassword(tempPassword);
      const newUser = this.usersRepository.create({
        googleUid,
        username,
        password: hashedPassword,
        email,
        role,
      });
      const savedUser = await this.usersRepository.save(newUser);
      this.logger.verbose(
        `New Google account created successfully: ${savedUser.email} (ID: ${savedUser.id})`,
      );
      return savedUser;
    } catch (error) {
      this.logger.error(
        `Error creating Google user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserByGoogleUid(googleUid: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { googleUid },
    });
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

  // READ - by Kakao UID
  async getUserByKakaoUid(kakaoUid: number): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { kakaoUid },
    });
  }

  // READ - by GitHub UID
  async getUserByGithubUid(githubUid: number): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { githubUid },
    });
  }

  // READ - by Naver UID
  async getUserByNaverUid(naverUid: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { naverUid },
    });
  }

  // CREATE - GitHub User
  async createUserByGithub(
    createGithubUserRequestDto: CreateGithubUserRequestDto,
  ): Promise<User> {
    this.logger.verbose(
      `Creating a new GitHub account with email: ${createGithubUserRequestDto.email}`,
    );
    const { githubUid, username, email, role } = createGithubUserRequestDto;

    if (!githubUid || !username || !email) {
      this.logger.error('Required fields missing for GitHub user creation.');
      throw new BadRequestException(
        'GitHub UID, username, and email must be provided for GitHub login.',
      );
    }

    try {
      await this.checkEmailExist(email);
      const tempPassword = uuidv4();
      const hashedPassword = await this.hashPassword(tempPassword);

      const newUser = this.usersRepository.create({
        githubUid,
        username,
        password: hashedPassword,
        email,
        role: role || UserRole.USER,
        status: UserStatus.ACTIVE,
      });

      const savedUser = await this.usersRepository.save(newUser);
      this.logger.verbose(
        `New GitHub account created successfully: ${savedUser.email} (ID: ${savedUser.id})`,
      );
      return savedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error creating GitHub user: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  // CREATE - Kakao User
  async createUserByKakao(
    createKakaoUserRequestDto: CreateKakaoUserRequestDto,
  ): Promise<User> {
    this.logger.verbose(
      `Creating a new Kakao account with email: ${createKakaoUserRequestDto.email}`,
    );
    const { kakaoUid, username, email, role } = createKakaoUserRequestDto;

    if (!kakaoUid || !username) {
      this.logger.error('Required fields missing for Kakao user creation.');
      throw new BadRequestException(
        'Kakao UID and username must be provided for Kakao login.',
      );
    }

    try {
      if (email) {
        await this.checkEmailExist(email);
      }
      const tempPassword = uuidv4();
      const hashedPassword = await this.hashPassword(tempPassword);

      const newUser = this.usersRepository.create({
        kakaoUid,
        username,
        password: hashedPassword,
        email,
        role: role || UserRole.USER,
      });

      const savedUser = await this.usersRepository.save(newUser);
      this.logger.verbose(
        `New Kakao account created successfully: ${savedUser.email} (ID: ${savedUser.id})`,
      );
      return savedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error creating Kakao user: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }


  // CREATE - Naver User
  async createUserByNaver(
    createNaverUserRequestDto: CreateNaverUserRequestDto,
  ): Promise<User> {
    this.logger.verbose(
      `Creating a new Naver account with email: ${createNaverUserRequestDto.email}`,
    );
    const { naverUid, username, email, role } = createNaverUserRequestDto;

    if (!naverUid || !username || !email) {
      this.logger.error('Required fields missing for Naver user creation.');
      throw new BadRequestException(
        'Naver UID, username, and email must be provided for Naver login.',
      );
    }

    try {
      await this.checkEmailExist(email);
      const tempPassword = uuidv4();
      const hashedPassword = await this.hashPassword(tempPassword);

      const newUser = this.usersRepository.create({
        naverUid,
        username,
        password: hashedPassword,
        email,
        role: role || UserRole.USER,
      });

      const savedUser = await this.usersRepository.save(newUser);
      this.logger.verbose(
        `New Naver account created successfully: ${savedUser.email} (ID: ${savedUser.id})`,
      );
      return savedUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error creating Naver user: ${errorMessage}`, errorStack);
      throw error;
    }
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

  // Update GitHub UID for merging (Phase 1)
  async updateGithubUid(id: number, githubUid: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    user.githubUid = githubUid;
    user.status = UserStatus.ACTIVE;
    return await this.usersRepository.save(user);
  }

  async updateKakaoUid(id: number, kakaoUid: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    user.kakaoUid = kakaoUid;
    return await this.usersRepository.save(user);
  }

  async updateNaverUid(id: number, naverUid: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    user.naverUid = naverUid;
    return await this.usersRepository.save(user);
  }

  // BUILD REPORT HANDLING
  async createBuildReport(dto: CreateUserWithAstAndBuildDto): Promise<any> {
    const { username, email, role, password, ProjectDto } = dto;
    const { teamName, jenkinsJobName, analysis, astNodes = [] } = ProjectDto;
    const { buildNumber, buildUrl } = analysis;

    let savedSnapshotId: number = 0;

    await this.dataSource.transaction(async (manager) => {
      const usernames = Array.isArray(username) ? username : [username];
      const projectUsers: User[] = [];

      // 1. Find or Create Users
      for (const uname of usernames) {
        const userCondition = (email && usernames.length === 1) ? { email } : { username: uname };
        let user = await manager.findOne(User, { where: userCondition });

        if (!user) {
          this.logger.log(`Creating new User (${uname})`);
          let hashedPassword: string | undefined = undefined;
          if (password) hashedPassword = await this.hashPassword(password);

          user = manager.create(User, {
            username: uname,
            email: (usernames.length === 1) ? (email || undefined) : undefined,
            password: hashedPassword || undefined,
            role: role as UserRole || UserRole.USER,
            status: password ? UserStatus.ACTIVE : UserStatus.PENDING,
          } as any);
          user = await manager.save(user);
        }
        projectUsers.push(user);
      }

      // 2. Find or Create TeamProject (독립적으로 체크)
      let project = await manager.findOne(TeamProject, {
        where: { teamName },
        relations: ['users'],
      });

      if (!project) {
        this.logger.log(`Creating new TeamProject (${teamName})`);
        project = manager.create(TeamProject, {
          teamName,
          JenkinsJobName: jenkinsJobName,
          users: projectUsers,
        } as any);
        project = await manager.save(project);
      } else {
        // 유저가 팀프에 없으면 연결
        for (const pUser of projectUsers) {
          const isUserInProject = project.users.some(u => u.id === pUser.id);
          if (!isUserInProject) {
            project.users.push(pUser);
          }
        }
        project.JenkinsJobName = jenkinsJobName;
        await manager.save(project);
      }

      // 3. Check Snapshot duplication
      const existingSnapshot = await manager.findOne(AstSnapshot, {
        where: { teamProjectId: project.id, buildNumber },
      });

      if (existingSnapshot) {
        this.logger.warn(`Snapshot for build ${buildNumber} already exists. Skipping.`);
        savedSnapshotId = existingSnapshot.id;
        return;
      }

      // 4. Save Snapshot + Relational AST
      const newSnapshot = manager.create(AstSnapshot, {
        teamProjectId: project.id,
        buildNumber,
        buildUrl,
        wholeJson: astNodes,
      });
      const savedSnapshot = await manager.save(newSnapshot);
      savedSnapshotId = savedSnapshot.id;

      const ckCtx = this.astRelationalService.buildCkContext(astNodes);
      for (const node of astNodes) {
        await this.astRelationalService.processNode(manager, node, savedSnapshotId, null, null, null, null, ckCtx);
      }
    });

    return { status: 'success', snapshotId: savedSnapshotId };
  }
}
