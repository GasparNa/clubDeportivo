// Stub CJS para @nestjs/common - compatible con Jest 29
"use strict";

// Decorators
// Se replican las claves de metadata reales de Nest para que los tests de
// controlador puedan inspeccionar guards, roles y pipes.
const GUARDS_METADATA = '__guards__';
const ROUTE_ARGS_METADATA = '__routeArguments__';
const RouteParamtypes = {
  REQUEST: 0,
  RESPONSE: 1,
  NEXT: 2,
  BODY: 3,
  QUERY: 4,
  PARAM: 5,
  HEADERS: 6,
};

function createDecorator() {
  return function () {};
}

function metadataTarget(target, descriptor) {
  return descriptor && descriptor.value ? descriptor.value : target;
}

function extendArrayMetadata(key, metadata, target) {
  const previous = Reflect.getMetadata(key, target) || [];
  const next = [...previous];
  metadata.forEach((entry) => {
    if (!next.includes(entry)) next.push(entry);
  });
  Reflect.defineMetadata(key, next, target);
}

function createRouteParamDecorator(paramtype) {
  return function (data, ...pipes) {
    return function (target, key, index) {
      const args =
        Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
      args[`${paramtype}:${index}`] = { index, data, pipes };
      Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target.constructor, key);
    };
  };
}

const Injectable = () => (target) => target;
const Controller = (prefix) => (target) => target;
const Module = (metadata) => (target) => target;
const Global = () => (target) => target;
const Catch = (...exceptions) => (target) => target;
const Param = createRouteParamDecorator(RouteParamtypes.PARAM);
const Body = createRouteParamDecorator(RouteParamtypes.BODY);
const Query = createRouteParamDecorator(RouteParamtypes.QUERY);
const Headers = createRouteParamDecorator(RouteParamtypes.HEADERS);
const Request = createRouteParamDecorator(RouteParamtypes.REQUEST);
const Req = Request;
const Res = () => createDecorator();
const HttpCode = (code) => createDecorator();
const Get = (path) => createDecorator();
const Post = (path) => createDecorator();
const Put = (path) => createDecorator();
const Patch = (path) => createDecorator();
const Delete = (path) => createDecorator();
const UseGuards = (...guards) => {
  return function (target, key, descriptor) {
    extendArrayMetadata(
      GUARDS_METADATA,
      guards,
      metadataTarget(target, descriptor),
    );
  };
};
const UsePipes = (...pipes) => createDecorator();
const UseInterceptors = (...interceptors) => createDecorator();
const UseFilters = (...filters) => createDecorator();
const SetMetadata = (key, value) => {
  return function (target, propertyKey, descriptor) {
    Reflect.defineMetadata(key, value, metadataTarget(target, descriptor));
  };
};

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

// Pipes
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ParseUUIDPipe {
  constructor(options) {
    this.options = options || {};
  }

  transform(value) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new BadRequestException('Validation failed (uuid is expected)');
    }
    return value;
  }
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
  Request,
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
  ParseUUIDPipe,
  NestInterceptor,
};