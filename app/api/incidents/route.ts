import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")

    if (!examId) {
      return NextResponse.json({ error: "Exam ID is required" }, { status: 400 })
    }

    // Get all incidents for this exam with student details
    const incidents = await db.incident.findMany({
      where: {
        examId: examId,
      },
      include: {
        student: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    })

    // Format the response
    const formattedIncidents = incidents.map((incident) => ({
      id: incident.id,
      studentId: incident.studentId,
      studentName: incident.student.name,
      rollNumber: incident.student.rollNumber,
      examId: incident.examId,
      incidentType: incident.incidentType,
      details: incident.details,
      url: incident.url || null,
      timestamp: incident.timestamp.toISOString(),
      screenshot: incident.screenshot || null,
    }))

    return NextResponse.json(formattedIncidents)
  } catch (error) {
    console.error("Failed to fetch incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { studentId, examId, incidentType, details, screenshot, url } = body

    if (!studentId || !examId || !incidentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const incident = await db.incident.create({
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
        incidentType,
        details: details || "",
        url: url || null,
        timestamp: new Date(),
        screenshot: screenshot || null,
      },
    })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error("Failed to create incident:", error)
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
