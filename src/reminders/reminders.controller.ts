import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto, UpdateReminderDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('includePaid') includePaid?: string,
  ) {
    return this.remindersService.findAll(req.user.id, includePaid === 'true');
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.remindersService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, req.user.id, dto);
  }

  @Patch(':id/mark-paid')
  markAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { renew?: boolean },
  ) {
    return this.remindersService.markAsPaid(id, req.user.id, body.renew || false);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.remindersService.remove(id, req.user.id);
  }
}

