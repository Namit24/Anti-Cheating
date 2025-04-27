"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

type Exam = {
  id: string
  roomNumber: string
  subjectCode: string
  subjectName: string
  status: string
  startTime: string
  studentsRegistered?: number
}

export function ExamList() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExams = async () => {
    try {
      const response = await fetch("/api/exams")
      if (!response.ok) {
        throw new Error("Failed to fetch exams")
      }
      const data = await response.json()
      setExams(data)
    } catch (error) {
      console.error("Error fetching exams:", error)
      toast({
        title: "Error",
        description: "Failed to load active exams.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()

    // Set up polling to refresh every 30 seconds
    const interval = setInterval(fetchExams, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleEndExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      })

      if (!response.ok) {
        throw new Error("Failed to end exam")
      }

      toast({
        title: "Exam Ended",
        description: "The exam has been successfully ended.",
      })

      fetchExams()
    } catch (error) {
      console.error("Error ending exam:", error)
      toast({
        title: "Error",
        description: "Failed to end the exam. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading exams...</div>
  }

  if (exams.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center">
        <p className="text-muted-foreground">No active exams found. Start an exam to see it here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Students</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => (
            <TableRow key={exam.id}>
              <TableCell className="font-medium">{exam.roomNumber}</TableCell>
              <TableCell>
                {exam.subjectCode}: {exam.subjectName}
              </TableCell>
              <TableCell>{new Date(exam.startTime).toLocaleTimeString()}</TableCell>
              <TableCell>
                <Badge variant={exam.status === "active" ? "default" : "secondary"}>
                  {exam.status === "active" ? "Active" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>{exam.studentsRegistered || 0}</TableCell>
              <TableCell className="text-right">
                {exam.status === "active" && (
                  <Button variant="destructive" size="sm" onClick={() => handleEndExam(exam.id)}>
                    End Exam
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
