import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Properly await params.id by destructuring it first
    const { id } = params

    const exam = await db.exam.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: { students: true, incidents: true },
        },
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: exam.id,
      roomNumber: exam.roomNumber,
      subjectCode: exam.subjectCode,
      subjectName: exam.subjectName,
      status: exam.status,
      startTime: exam.startTime.toISOString(),
      studentsRegistered: exam._count.students,
      incidentsCount: exam._count.incidents,
    })
  } catch (error) {
    console.error("Failed to fetch exam:", error)
    return NextResponse.json({ error: "Failed to fetch exam" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    // Properly await params.id by destructuring it first
    const { id } = params

    const updatedExam = await db.exam.update({
      where: {
        id,
      },
      data: {
        ...body,
      },
    })

    return NextResponse.json(updatedExam)
  } catch (error) {
    console.error("Failed to update exam:", error)
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Properly await params.id by destructuring it first
    const { id } = params

    await db.exam.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete exam:", error)
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 })
  }
}
