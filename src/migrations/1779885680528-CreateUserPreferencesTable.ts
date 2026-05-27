import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserPreferencesTable1779885680528 implements MigrationInterface {
  name = 'CreateUserPreferencesTable1779885680528';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_preferences (
        user_id UUID PRIMARY KEY,
        preferences JSONB NOT NULL,
        quiet_hours JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE user_preferences`);
  }
}
