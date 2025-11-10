import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateTransactionDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  @Get()
  list(@Req() req: any, @Query('walletId') walletId: string) {
    if (!walletId) throw new Error('walletId es requerido');
    return this.svc.listByWallet(req.user.id, walletId);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateTransactionDto) {
    return this.svc.create(req.user.id, body);
  }
}
