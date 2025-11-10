import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AddMemberDto, CreateWalletDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly svc: WalletsService) {}

  @Post()
  create(@Req() req: any, @Body() body: CreateWalletDto) {
    return this.svc.create(req.user.id, body);
  }

  @Get()
  listMine(@Req() req: any) {
    return this.svc.listMine(req.user.id);
  }

  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() body: AddMemberDto) {
    return this.svc.addMember(req.user.id, id, body.email);
  }

  @Get(':id/balances')
  balances(@Param('id') id: string) {
    return this.svc.computeBalances(id);
  }

  @Get(':id/settlements/suggest')
  suggest(@Param('id') id: string) {
    return this.svc.suggestSettlements(id);
  }
}
