import { Injectable, NestMiddleware, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RouteInfo } from '@nestjs/common/interfaces';
import { request } from 'http';
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // console.log(`req:`, {
    //     headers: req.headers,
    //     body: req.body,
    //     originalUrl: req.originalUrl,
    // });

    // Getting the response log
    getResponseLog(res);

    // Ends middleware function execution, hence allowing to move on
    if (next) {
      next();
    }
  }
}

const getResponseLog = (res: Response) => {
  const rawResponse = res.write;
  const rawResponseEnd = res.end;

  let chunkBuffers = [];

  console.log(`======>> Beginning res.write`);
  res.write = (...chunks) => {
    const resArgs = [];
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i]) resArgs[i] = Buffer.from(chunks[i]);
      if (!chunks[i]) {
        res.once('drain', res.write);
        --i;
      }
    }

    if (Buffer.concat(resArgs)?.length) {
      chunkBuffers = [...chunkBuffers, ...resArgs];
    }

    return rawResponse.apply(res, resArgs);
  };

  console.log(`========> Done writing, beginning res.end`);
  res.end = (...chunks) => {
    console.log(
      `========> Chunks gathered during res.write: ${typeof chunkBuffers}`,
      Buffer.from(chunkBuffers).toJSON(),
    );
    console.log(
      `========> Chunks to handle during res.end: ${typeof chunks}`,
      Buffer.from(chunks).toJSON(),
    );

    const resArgs = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`res.end chunk ${i} content: ${typeof chunks[i]}`, chunks[i]);

      // undefined values would break Buffer.concat(resArgs)
      if (chunks[i]) resArgs[i] = Buffer.from(chunks[i]);
    }

    // resArgs[0] contains the response body
    if (Buffer.concat(resArgs)?.length) {
      chunkBuffers = [...chunkBuffers, ...resArgs];
    }
    const body = Buffer.concat(chunkBuffers).toString('utf8');
    res.setHeader('origin', 'restjs-req-res-logging-repo');

    const responseLog = {
      response: {
        statusCode: res.statusCode,
        body: body || {},
        headers: res.getHeaders(),
      },
    };
    console.log('res: ', responseLog);
    rawResponseEnd.apply(res, resArgs);
    return responseLog as unknown as Response;
  };
};
