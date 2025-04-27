import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const exams = await db.exam.findMany({
      orderBy: {
        startTime: "desc",
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    })

    // Transform the data to include studentsRegistered count
    const formattedExams = exams.map((exam) => ({
      id: exam.id,
      roomNumber: exam.roomNumber,
      subjectCode: exam.subjectCode,
      subjectName: exam.subjectName,
      status: exam.status,
      startTime: exam.startTime.toISOString(),
      studentsRegistered: exam._count.students,
    }))

    return NextResponse.json(formattedExams)
  } catch (error) {
    console.error("Failed to fetch exams:", error)
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { roomNumber, subjectCode, subjectName, status, startTime } = body

    if (!roomNumber || !subjectCode || !subjectName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const exam = await db.exam.create({
      data: {
        roomNumber,
        subjectCode,
        subjectName,
        status: status || "active",
        startTime: new Date(startTime || Date.now()),
      },
    })

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    console.error("Failed to create exam:", error)
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 })
  }
}
