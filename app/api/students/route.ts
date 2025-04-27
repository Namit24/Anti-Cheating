import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")

    if (!examId) {
      return NextResponse.json({ error: "Exam ID is required" }, { status: 400 })
    }

    // Get all students for this exam
    const students = await db.student.findMany({
      where: {
        examId: examId,
      },
      orderBy: {
        name: "asc",
      },
    })

    // Get incident counts for each student
    const studentsWithIncidents = await Promise.all(
      students.map(async (student) => {
        const incidentCount = await db.incident.count({
          where: {
            studentId: student.id,
          },
        })

        return {
          ...student,
          incidentCount,
          // Convert dates to strings for JSON serialization
          createdAt: student.createdAt.toISOString(),
          updatedAt: student.updatedAt.toISOString(),
          lastActive: student.lastActive ? student.lastActive.toISOString() : null,
        }
      }),
    )

    return NextResponse.json(studentsWithIncidents)
  } catch (error) {
    console.error("Failed to fetch students:", error)
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, rollNumber, roomNumber, examId } = body

    if (!name || !rollNumber || !roomNumber || !examId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if the exam exists and is active
    const exam = await db.exam.findUnique({
      where: {
        id: examId,
        status: "active",
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found or not active" }, { status: 404 })
    }

    // Check if student is already registered for this exam
    const existingStudent = await db.student.findFirst({
      where: {
        rollNumber,
        examId,
      },
    })

    if (existingStudent) {
      return NextResponse.json(existingStudent, { status: 200 })
    }

    const student = await db.student.create({
      data: {
        name,
        rollNumber,
        roomNumber,
        examId,
        status: "active",
        lastActive: new Date(),
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error("Failed to register student:", error)
    return NextResponse.json({ error: "Failed to register student" }, { status: 500 })
  }
}

// Update student status (heartbeat)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { studentId, status, extensionActive, lastHeartbeat } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const student = await db.student.update({
      where: {
        id: studentId,
      },
      data: {
        status: status || "active",
        lastActive: new Date(),
        extensionActive: extensionActive !== undefined ? extensionActive : true,
        lastHeartbeat: lastHeartbeat ? new Date(lastHeartbeat) : undefined,
      },
    })

    // Check if we need to create an incident for extension reactivation
    if (extensionActive && student.extensionActive === false) {
      // Extension was previously inactive but is now active again
      await db.incident.create({
        data: {
          student: {
            connect: {
              id: studentId,
            },
          },
          exam: {
            connect: {
              id: student.examId,
            },
          },
          incidentType: "extension_reactivated",
          details: "Extension was reactivated after being disabled",
          timestamp: new Date(),
        },
      })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error("Failed to update student status:", error)
    return NextResponse.json({ error: "Failed to update student status" }, { status: 500 })
  }
}
