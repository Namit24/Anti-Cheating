import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const examId = searchParams.get("examId")

    if (!studentId || !examId) {
      return NextResponse.json({ error: "Student ID and Exam ID are required" }, { status: 400 })
    }

    // Create an incident for extension removal
    await db.incident.create({
      data: {
        student: {
          connect: {
            id: studentId,
          },
        },
        exam: {
          connect: {
            id: examId,
          },
        },
        incidentType: "extension_removed",
        details: "Extension was uninstalled during the exam",
        timestamp: new Date(),
      },
    })

    // Update student record to mark extension as inactive
    await db.student.update({
      where: {
        id: studentId,
      },
      data: {
        extensionActive: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to record extension removal:", error)
    return NextResponse.json({ error: "Failed to record extension removal" }, { status: 500 })
  }
}
