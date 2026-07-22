export class RepositorySummaryDto {
  id!: number;
  name!: string;
  fullName!: string;
  private!: boolean;
  description!: string | null;
  language!: string | null;
  defaultBranch!: string;
  updatedAt!: string;
  htmlUrl!: string;
  stargazersCount!: number;
}
