import { Response } from 'express';
import HttpStatusCode from 'http-status-codes';
import { TypeORMError } from 'typeorm';
import { AxiosError } from 'axios';

import { ApiResponse } from './apiResponse';
import { INTERNAL_SERVER_ERROR, SOMETHING_WENT_WRONG } from '@src/config/messages/codes';
import { ErrorItem } from '../types/apiErrorRequestType';
import { HTTP_STATUS_MESSAGE } from '@src/constants/messages';
import ErrorResponseBody from '../types/errorResponseBody';

export default class CustomError extends Error {
  public status: number;
  public errors: Array<ErrorItem> = new Array<ErrorItem>();

  public constructor(status?: number, message?: string, errors?: Array<ErrorItem>) {
    super(message);
    if (status) {
      this.status = status;
    }

    if (message) {
      this.message = message;
    }

    if (errors) {
      this.errors = errors;
    }
  }

  public static errorHandler(customError: CustomError, res: Response<ApiResponse<ErrorResponseBody>>): void {
    try {
      const response = new ApiResponse<ErrorResponseBody>();
      response.status = customError.status;
      response.message = customError.message;
      response.body = <ErrorResponseBody>{
        errors: customError.errors || [{ errors: [INTERNAL_SERVER_ERROR] }],
      };
      res.status(response.status).send(response);
    } catch (error) {
      const errorResponse = new ApiResponse<ErrorResponseBody>();
      errorResponse.status = HttpStatusCode.INTERNAL_SERVER_ERROR;
      errorResponse.message = INTERNAL_SERVER_ERROR;
      errorResponse.body = {
        errors: [{ messages: [SOMETHING_WENT_WRONG] }],
      };
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send(errorResponse);
    }
  }

  public static getCustomErrorObject(error: unknown): CustomError {
    const axiosError = error as AxiosError;
    const message = INTERNAL_SERVER_ERROR;
    const status = HttpStatusCode.INTERNAL_SERVER_ERROR;

    let payload: Partial<CustomError> = new CustomError(status, message);

    if (typeof error === 'string') {
      payload = { errors: [{ messages: [error] }] };
    } else if (error instanceof CustomError) {
      return error;
    } else if (
      error &&
      axiosError.isAxiosError &&
      axiosError.response &&
      axiosError.response.data &&
      axiosError.response.status
    ) {
      payload = {
        status: axiosError.response.status,
        message: axiosError.response.statusText,
        errors: [{ messages: [JSON.stringify(axiosError.response.data)] }],
      };
    } else if (error instanceof Error || error instanceof TypeORMError) {
      payload = { errors: [{ messages: [error.message] }] };
    }

    return new CustomError(
      payload.status || status,
      payload.message || message,
      payload.errors || [{ messages: [SOMETHING_WENT_WRONG] }],
    );
  }

  public static getNotFoundError(message: string): CustomError {
    return new CustomError(HttpStatusCode.NOT_FOUND, HTTP_STATUS_MESSAGE.NOT_FOUND, [{ messages: [message] }]);
  }

  public static getForbiddenError(message: string): CustomError {
    return new CustomError(HttpStatusCode.FORBIDDEN, HTTP_STATUS_MESSAGE.FORBIDDEN, [{ messages: [message] }]);
  }

  public static getConflictError(message: string): CustomError {
    return new CustomError(HttpStatusCode.CONFLICT, HTTP_STATUS_MESSAGE.CONFLICT, [{ messages: [message] }]);
  }

  public static getUnauthorizedError(message: string): CustomError {
    return new CustomError(HttpStatusCode.UNAUTHORIZED, HTTP_STATUS_MESSAGE.UNAUTHORIZED, [{ messages: [message] }]);
  }
}
