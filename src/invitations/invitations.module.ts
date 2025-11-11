import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerService } from '../mailer/mailer.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, MailerService],
  exports: [InvitationsService],
})
export class InvitationsModule {}

