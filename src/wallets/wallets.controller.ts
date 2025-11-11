import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateWalletDto, JoinWalletDto, UpdateWalletNameDto } from './dto';

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

  @Post('join')
  joinByCode(@Req() req: any, @Body() body: JoinWalletDto) {
    return this.svc.joinByCode(req.user.id, body.inviteCode);
  }

  // IMPORTANTE: Las rutas con métodos específicos (PATCH, DELETE) deben ir ANTES de todas las rutas GET con :id
  @Patch(':id/name')
  updateName(@Req() req: any, @Param('id') id: string, @Body() body: UpdateWalletNameDto) {
    return this.svc.updateName(req.user.id, id, body.name);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.svc.removeMember(req.user.id, id, memberId);
  }

  @Post(':id/leave')
  leaveWallet(@Req() req: any, @Param('id') id: string) {
    return this.svc.leaveWallet(req.user.id, id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.id, id);
  }

  // Rutas GET específicas deben ir antes de la ruta genérica GET :id
  @Get(':id/balances')
  balances(@Param('id') id: string) {
    return this.svc.computeBalances(id);
  }

  @Get(':id/settlements/suggest')
  suggest(@Param('id') id: string) {
    return this.svc.suggestSettlements(id);
  }

  @Get(':id/settlements')
  listSettlements(@Req() req: any, @Param('id') id: string) {
    return this.svc.listSettlements(id, req.user.id);
  }

  @Post(':id/settlements')
  createSettlement(@Req() req: any, @Param('id') id: string, @Body() body: { fromUserId: string; toUserId: string; amount: number }) {
    return this.svc.createSettlement(req.user.id, id, body.fromUserId, body.toUserId, body.amount);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.svc.getById(id, req.user.id);
  }
}
