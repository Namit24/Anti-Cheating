import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Properly await params.id by destructuring it first
    const { id } = params

    const student = await db.student.findUnique({
      where: {
        id,
      },
      include: {
        exam: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Format dates for JSON serialization
    return NextResponse.json({
      ...student,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      lastActive: student.lastActive ? student.lastActive.toISOString() : null,
      exam: {
        ...student.exam,
        startTime: student.exam.startTime.toISOString(),
        endTime: student.exam.endTime ? student.exam.endTime.toISOString() : null,
        createdAt: student.exam.createdAt.toISOString(),
        updatedAt: student.exam.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to fetch student:", error)
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    // Properly await params.id by destructuring it first
    const { id } = params

    const updatedStudent = await db.student.update({
      where: {
        id,
      },
      data: {
        ...body,
        lastActive: new Date(),
      },
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error("Failed to update student:", error)
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
  }
}
