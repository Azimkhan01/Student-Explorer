import { Module } from '@nestjs/common';
import { CreateSocket } from './socket.js';

@Module({
    providers:[CreateSocket]
})
export class SocketModule {}
