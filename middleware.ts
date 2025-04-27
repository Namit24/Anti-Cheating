import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // Get the origin from the request headers
    const origin = request.headers.get("origin") || "*"

    // Only apply CORS middleware to API routes
    if (request.nextUrl.pathname.startsWith("/api")) {
        // Handle OPTIONS request for CORS preflight
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            })
        }

        // For all other API requests, add CORS headers to the response
        const response = NextResponse.next()

        response.headers.set("Access-Control-Allow-Origin", origin)
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        return response
    }

    // For non-API routes, just continue
    return NextResponse.next()
}

// Configure the middleware to only run on API routes
export const config = {
    matcher: "/api/:path*",
}
