import { Controller, Delete, Get, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: any) {
    return this.users.delete(req.user.id);
  }
}
