// Stub CJS para @nestjs/common - compatible con Jest 29
"use strict";

// Decorators
function createDecorator() {
  return function () {};
}

const Injectable = () => (target) => target;
const Controller = (prefix) => (target) => target;
const Module = (metadata) => (target) => target;
const Global = () => (target) => target;
const Catch = (...exceptions) => (target) => target;
const Param = (property) => createDecorator();
const Body = (property) => createDecorator();
const Query = (property) => createDecorator();
const Headers = (property) => createDecorator();
const Req = () => createDecorator();
const Res = () => createDecorator();
const HttpCode = (code) => createDecorator();
const Get = (path) => createDecorator();
const Post = (path) => createDecorator();
const Put = (path) => createDecorator();
const Patch = (path) => createDecorator();
const Delete = (path) => createDecorator();
const UseGuards = (...guards) => createDecorator();
const UsePipes = (...pipes) => createDecorator();
const UseInterceptors = (...interceptors) => createDecorator();
const UseFilters = (...filters) => createDecorator();
const SetMetadata = (key, value) => createDecorator();

// Enums
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Exception classes
class HttpException extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class BadRequestException extends HttpException {
  constructor(message) { super(message || 'Bad Request', 400); }
}
class UnauthorizedException extends HttpException {
  constructor(message) { super(message || 'Unauthorized', 401); }
}
class ForbiddenException extends HttpException {
  constructor(message) { super(message || 'Forbidden', 403); }
}
class NotFoundException extends HttpException {
  constructor(message) { super(message || 'Not Found', 404); }
}
class ConflictException extends HttpException {
  constructor(message) { super(message || 'Conflict', 409); }
}
class InternalServerErrorException extends HttpException {
  constructor(message) { super(message || 'Internal Server Error', 500); }
}
class ServiceUnavailableException extends HttpException {
  constructor(message) { super(message || 'Service Unavailable', 503); }
}

// Interfaces (abstract classes for DI)
class CanActivate {}
class ExecutionContext {}
class CallHandler {}
class ArgumentsHost {}
class ExceptionFilter {}
class PipeTransform {}
class NestInterceptor {}

module.exports = {
  Injectable,
  Controller,
  Module,
  Global,
  Catch,
  Param,
  Body,
  Query,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UseFilters,
  SetMetadata,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
  CanActivate,
  ExecutionContext,
  CallHandler,
  ArgumentsHost,
  ExceptionFilter,
  PipeTransform,
  NestInterceptor,
};