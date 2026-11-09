import {
    flatten,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MakeCreatorCodeDTO } from './dto/makeCreatorCode.DTO.js';
import { signupUserDTO } from './dto/signupUserDTO.js';
import { CheckCreatorCodeDTO } from './dto/checkCreatorCode.DTO.js';
import { firstValueFrom } from 'rxjs';
import { LoginUserDTO } from './dto/LoginUser.dto.js';
import { Student } from '../entity/student.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { verifyOTPDTO } from './dto/verifyotp.dto.js';
import { JwtService } from '@nestjs/jwt';
import { Teacher } from '../entity/teacher.entity.js';
import { hashPassword, verifyPassword } from './auth.utils.js';
import { checkFrogotPasswordOTP, ForgotPasswordOTPDTO } from './dto/forgotpasswordotp.dto.js';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
@Injectable()
export class AuthService {
    constructor(
        @Inject('USER_SERVICE')
        private readonly userClient: ClientProxy,
        @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
        @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) { }

    async makeCreatorCode(makeCreatorCodedto: MakeCreatorCodeDTO) {

        try {
            const user: any = makeCreatorCodedto.role === "student"
                ? await this.studentRepo.findOne({
                    where: {
                        username: makeCreatorCodedto.username,
                        email: makeCreatorCodedto.email
                    }
                })

                : makeCreatorCodedto.role === "teacher" && await this.teacherRepo.findOne({
                    where: {
                        username: makeCreatorCodedto.username,
                        email: makeCreatorCodedto.email
                    }
                });

            if (user === null)
                return { message: "There is no such Student in the record!", status: false };
        
            if(user.active === true)
                return {message:"User Already Sign in Please visit the Login page.",status:false}

            await this.userClient.emit({ cmd: 'sendCreatorCode' }, makeCreatorCodedto)
            return { message: "Email Sent Successfully! ", status: true }

        }
        catch (err) {
            console.log(err)
            return { message: "Some Server Error Happen Please Try Again Later ! ", status: false }
        }
    }

    async checkCreatorCode(checkCreatorCodedto: CheckCreatorCodeDTO) {

        try {
            return await
                firstValueFrom(

                    this.userClient.send({ cmd: "checkCreatorCode" }, checkCreatorCodedto)
                )
        }
        catch (err) {
            throw new Error("Something went wrong on server side !!")
        }
    }

    async forgotPasswordOTP(forgotPasswordotpdto: ForgotPasswordOTPDTO) {
        try {
            const user = forgotPasswordotpdto.role === "student"
                ?
                await this.studentRepo.findOne({
                    where: {
                        email: forgotPasswordotpdto.email,
                    }
                })
                :
                forgotPasswordotpdto.role === "teacher"
                &&
                await this.teacherRepo.findOne({
                    where: {
                        email: forgotPasswordotpdto.email,
                    }
                });

            if (user == null)
                throw new NotFoundException("No User with this email .");

            return firstValueFrom(this.userClient.send({ cmd: "forgot-password-otp" }, { ...forgotPasswordotpdto }));

        }
        catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }

            console.error(err);

            throw new InternalServerErrorException(
                'Something Went Wrong!',
                { cause: err },
            );
        }
    }

    async resetPassword(data: ResetPasswordDTO) {

    const { email, role, newPassword } = data;

    // 1. Check whether OTP verification was completed
   
    const checkVerfication:any= await this.userClient.send({cmd:"forgot-password-otp-verfication"},{...this.forgotPasswordOTP})

    if(checkVerfication.status === false)
     return checkVerfication

    // 2. Find the correct user
    let user;

    if (role === 'student') {

        user = await this.studentRepo.findOne({
            where: { email }
        });

    } else if (role === 'teacher') {

        user = await this.teacherRepo.findOne({
            where: { email }
        });

    } else {

        throw new UnauthorizedException('Invalid account role.');

    }

    if (!user) {
        throw new NotFoundException('User not found.');
    }

    // 3. Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // 4. Update the password
    user.password = hashedPassword;

    if (role === 'student') {
        await this.studentRepo.save(user);
    } else {
        await this.teacherRepo.save(user);
    }

    // 5. Delete verification and OTP keys
    // await this.redis.del(verificationKey);
    // await this.redis.del(`ForgotPassword:${role}:${email}`);

    return {
        status: true,
        message: 'Password reset successfully.'
    };
}

    async checkForgotPasswordOTP(checkForgotPasswordOTP: checkFrogotPasswordOTP) {
        try {

            const checkCode = await this.userClient.send({ cmd: "checkForgotPassword" }, { ...checkForgotPasswordOTP });

            return checkCode;

        }
        catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }

            console.error(err);

            throw new InternalServerErrorException(
                'Something Went Wrong!',
                { cause: err },
            );
        }
    }

    async signupUser(signupUserdto: signupUserDTO) {
        try {

            console.log(signupUserdto)

            const user: any = signupUserdto.role === "student"
                ?
                await this.studentRepo.findOne({
                    where: {
                        email: signupUserdto.email,
                        username: signupUserdto.username
                    }
                })
                :
                signupUserdto.role === "teacher"
                &&
                await this.teacherRepo.findOne({
                    where: {
                        email: signupUserdto.email,
                        username: signupUserdto.username
                    }
                });

            // console.log(user);

            if (!user)
                throw new NotFoundException("User Not Found .");


            if (user.active === true) {
                return {
                    message: "User Already Signup please go to the Login Page .",
                    status: false
                }
            }


            const result: any = await this.checkCreatorCode({ username: signupUserdto.username, email: signupUserdto.email, creatorCode: signupUserdto.creatorCode, role: user.role })
            // console.log(result);

            if (!result?.status)
                return { message: "Creator Code is incorrect", status: false };

            user.active = true;
            user.password = await hashPassword(signupUserdto.password);
            user.role === "student"
                ? await this.studentRepo.save(user)
                : user.role === 'teacher' && await this.teacherRepo.save(user);

            return { message: "User Registered Successfully ", success: true };
        }
        catch (err) {
            console.log(err)
            throw new Error("Something went wrong on server side !!")
        }
    }

    async loginUser(loginUserDto: LoginUserDTO) {
        try {
            const { email, password, role } = loginUserDto;

            const user: any = role === "student"
                ? await this.studentRepo.findOne({
                    where: {
                        email
                    }
                })
                : role === "teacher" && await this.teacherRepo.findOne({
                    where: {
                        email
                    }
                });

            // console.log(user);


            if (!user || user.active === false)
                throw new NotFoundException("User not Registered yet please go to the signup page .");

            const matchPassword = await verifyPassword(password, user.password);

            if (matchPassword === false)
                throw new UnauthorizedException(" Email or the password is incorrect..");

            // STEP 2: Create JWT payload.
            const payload = {
                sub: user.id,
                email: user.email,
                role: user.role,
            };

            // STEP 3: Sign JWT.
            const accessToken = await this.jwtService.signAsync(payload);

            // STEP 4: Return token and safe user details.
            return {
                status: true,
                message: 'User Login Successfully!',
                access_token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
            };

        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }

            console.error(err);

            throw new InternalServerErrorException(
                'Something Went Wrong!',
                { cause: err },
            );
        }
    }

    async loginAdmin(email: string) {
        try {
            const registeredEmail =
                this.configService.get<string>('REGISTERED_ADMIN_EMAIL');

            if (
                !registeredEmail ||
                email.trim().toLowerCase() !== registeredEmail.trim().toLowerCase()
            ) {
                throw new UnauthorizedException('Unauthorized Email!');
            }

            const otp = await firstValueFrom(
                this.userClient.send(
                    { cmd: 'send-admin-otp' },
                    { email: email.trim().toLowerCase() },
                ),
            );

            return otp;

        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }

            console.error(err);

            throw new InternalServerErrorException(
                'Something went wrong!',
            );
        }
    }

    // ========================================
    // VERIFY OTP AND GENERATE JWT
    // ========================================

    async verifyOTP(verifyOTP: verifyOTPDTO) {
        try {
            // STEP 1: Verify OTP through user microservice.

            const checkOtp = await firstValueFrom(
                this.userClient.send(
                    { cmd: 'verify-admin-otp' },
                    { ...verifyOTP },
                ),
            );

            // STEP 2: Check whether OTP verification succeeded.
            // IMPORTANT: Adapt this condition to your microservice response.
            // This example expects { success: true } or { status: true }.

            const isVerified =
                checkOtp?.success === true || checkOtp?.status === true;

            if (!isVerified) {
                throw new UnauthorizedException(
                    checkOtp?.message || 'Invalid or expired OTP!',
                );
            }

            // STEP 3: Create JWT payload.

            const payload = {
                sub: verifyOTP.email,
                email: verifyOTP.email,
                role: 'admin',
            };

            // STEP 4: Generate JWT.

            const accessToken = await this.jwtService.signAsync(payload);

            // STEP 5: Return token to controller.
            // Controller will put it inside an HTTP-only cookie.

            return {
                success: true,
                message: 'Admin authenticated successfully!',
                accessToken,
                user: {
                    email: verifyOTP.email,
                    role: 'admin',
                },
            };

        } catch (err) {
            if (
                err instanceof UnauthorizedException
            ) {
                throw err;
            }

            console.error(err);

            throw new InternalServerErrorException(
                'Something went wrong!',
            );
        }
    }

}
