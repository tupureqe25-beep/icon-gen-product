declare module "next" {
  export type Metadata = Record<string, unknown>;
  export type NextConfig = Record<string, unknown>;
}

declare module "next/types.js" {
  export type PageConfig = Record<string, unknown>;
  export type RouteSegmentConfig = Record<string, unknown>;
  export type ResolvingMetadata = Promise<Record<string, unknown>>;
  export type ResolvingViewport = Promise<Record<string, unknown>>;
}

declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type Metadata = Record<string, unknown>;
  export type Viewport = Record<string, unknown>;
  export type ResolvingMetadata = Promise<Record<string, unknown>>;
  export type ResolvingViewport = Promise<Record<string, unknown>>;
}

declare module "next/dist/build/segment-config/app/app-segment-config.js" {
  export type AppSegmentConfig = Record<string, unknown>;
  export type InstantConfigForTypeCheckInternal = Record<string, unknown>;
}

declare module "next/server.js" {
  export class NextRequest extends Request {}
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): Response;
  }
}
