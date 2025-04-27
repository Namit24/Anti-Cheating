"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileDown } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { StudentList } from "@/components/student-list"
import { IncidentList } from "@/components/incident-list"

export default function ExamDetails() {
  const params = useParams()
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const response = await fetch(`/api/exams/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch exam details")
        const data = await response.json()
        setExam(data)
      } catch (error) {
        console.error("Error fetching exam details:", error)
        toast({
          title: "Error",
          description: "Failed to load exam details.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchExamDetails()

    // Set up polling to refresh data every 10 seconds
    const interval = setInterval(fetchExamDetails, 10000)
    return () => clearInterval(interval)
  }, [params.id])

  const handleEndExam = async () => {
    try {
      const response = await fetch(`/api/exams/${params.id}`, {
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

      // Ask if user wants to download CSV
      const downloadCSV = window.confirm("Do you want to download the exam data as CSV?")

      if (downloadCSV) {
        await exportExamDataToCSV(params.id as string)
      }

      router.push("/")
    } catch (error) {
      console.error("Error ending exam:", error)
      toast({
        title: "Error",
        description: "Failed to end the exam. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Function to export exam data to CSV
  const exportExamDataToCSV = async (examId: string) => {
    try {
      // Fetch all data needed for the CSV
      const [examResponse, studentsResponse, incidentsResponse] = await Promise.all([
        fetch(`/api/exams/${examId}`),
        fetch(`/api/students?examId=${examId}`),
        fetch(`/api/incidents?examId=${examId}`),
      ])

      if (!examResponse.ok || !studentsResponse.ok || !incidentsResponse.ok) {
        throw new Error("Failed to fetch exam data")
      }

      const exam = await examResponse.json()
      const students = await studentsResponse.json()
      const incidents = await incidentsResponse.json()

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,"

      // Exam info header
      csvContent += `Exam Report: ${exam.subjectName} (${exam.subjectCode})\r\n`
      csvContent += `Room: ${exam.roomNumber}\r\n`
      csvContent += `Date: ${new Date(exam.startTime).toLocaleDateString()}\r\n`
      csvContent += `Start Time: ${new Date(exam.startTime).toLocaleTimeString()}\r\n`
      csvContent += `End Time: ${new Date().toLocaleTimeString()}\r\n\r\n`

      // Students section
      csvContent += "STUDENTS\r\n"
      csvContent += "Name,Roll Number,Room,Status,Last Active,Incidents,Extension Active\r\n"

      students.forEach((student: any) => {
        const lastActive = student.lastActive ? new Date(student.lastActive).toLocaleTimeString() : "N/A"
        csvContent += `${student.name},${student.rollNumber},${student.roomNumber},${student.status},${lastActive},${student.incidentCount || 0},${student.extensionActive ? "Yes" : "No"}\r\n`
      })

      csvContent += "\r\n"

      // Incidents section
      csvContent += "INCIDENTS\r\n"
      csvContent += "Student Name,Roll Number,Incident Type,Time,Details\r\n"

      incidents.forEach((incident: any) => {
        // Escape any commas in the details to prevent CSV format issues
        const sanitizedDetails = incident.details.replace(/,/g, ";").replace(/\r?\n/g, " ")
        csvContent += `${incident.studentName},${incident.rollNumber},${incident.incidentType},${new Date(incident.timestamp).toLocaleTimeString()},"${sanitizedDetails}"\r\n`
      })

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `exam_report_${exam.subjectCode}_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)

      // Trigger download
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export exam data to CSV.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading exam details...</div>
  }

  if (!exam) {
    return (
      <div className="container p-4 mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Exam Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p>The requested exam could not be found. It may have been deleted or never existed.</p>
            <Button asChild className="mt-4">
              <Link href="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container p-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Exam Details</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => exportExamDataToCSV(params.id as string)}
            className="flex items-center"
          >
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          {exam.status === "active" && (
            <Button variant="destructive" onClick={handleEndExam}>
              End Exam
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{exam.subjectName}</CardTitle>
          <CardDescription>
            Room {exam.roomNumber} | {exam.subjectCode} | Started at {new Date(exam.startTime).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={exam.status === "active" ? "default" : "secondary"} className="mt-1">
                {exam.status === "active" ? "Active" : "Completed"}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-2xl font-bold mt-1">{exam.studentsRegistered || 0}</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Incidents</p>
              <p className="text-2xl font-bold mt-1">{exam.incidentsCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Registered Students</CardTitle>
              <CardDescription>Students who have registered for this exam</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentList examId={params.id as string} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Detected Incidents</CardTitle>
              <CardDescription>Suspicious activities detected during this exam</CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentList examId={params.id as string} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
