import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './data-source';
import { PreferencesModule } from './modules/preferences/preferences.module';

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), PreferencesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
