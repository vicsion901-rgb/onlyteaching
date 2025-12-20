import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private dataSource: DataSource) {}

  @Get('db-check')
  check() {
    return {
      connected: this.dataSource.isInitialized,
    };
  }
}