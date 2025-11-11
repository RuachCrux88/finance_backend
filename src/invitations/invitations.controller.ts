import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('wallet/:walletId')
  createInvitation(
    @Req() req: any,
    @Param('walletId') walletId: string,
    @Body() body: { email: string },
  ) {
    return this.invitationsService.createInvitation(req.user.id, walletId, body.email);
  }

  @Post('accept')
  acceptInvitation(@Req() req: any, @Body() body: { token: string }) {
    return this.invitationsService.acceptInvitation(body.token, req.user.id);
  }

  @Get('pending')
  getPendingInvitations(@Req() req: any) {
    return this.invitationsService.getPendingInvitations(req.user.id);
  }
}

