"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Eye, AlertTriangle, BarChart3, Users, Clock, Calendar, BookOpen, School } from "lucide-react"

type Exam = {
  id: string
  roomNumber: string
  subjectCode: string
  subjectName: string
  status: string
  startTime: string
  studentsRegistered?: number
  incidentsCount?: number
}

export default function Dashboard() {
  const [roomNumber, setRoomNumber] = useState("")
  const [subjectCode, setSubjectCode] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
        description: "Failed to load exams.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()

    // Set up polling to refresh every 10 seconds
    const interval = setInterval(fetchExams, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleStartExam = async () => {
    if (!roomNumber || !subjectCode || !subjectName) {
      toast({
        title: "Missing information",
        description: "Please fill in all the required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomNumber,
          subjectCode,
          subjectName,
          status: "active",
          startTime: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start exam")
      }

      const exam = await response.json()

      toast({
        title: "Exam Started",
        description: `Room ${roomNumber} - ${subjectName} exam has started successfully.`,
      })

      // Reset form
      setRoomNumber("")
      setSubjectCode("")
      setSubjectName("")

      // Refresh exams list
      fetchExams()

      // Navigate to the exam details page
      router.push(`/exams/${exam.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start the exam. Please try again.",
        variant: "destructive",
      })
    }
  }

  const activeExams = exams.filter((e) => e.status === "active").length
  const totalStudents = exams.reduce((acc, exam) => acc + (exam.studentsRegistered || 0), 0)
  const totalIncidents = exams.reduce((acc, exam) => acc + (exam.incidentsCount || 0), 0)

  return (
      <div className="container p-6 mx-auto">
        <div className="flex flex-col items-center justify-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Exam Proctoring System
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl">
            Monitor and prevent cheating during online programming exams with advanced AI detection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
                Total Exams
              </CardTitle>
              <CardDescription>All exams in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-700">{exams.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5 text-green-600" />
                Active Exams
              </CardTitle>
              <CardDescription>Currently running exams</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-700">{activeExams}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5 text-purple-600" />
                Total Students
              </CardTitle>
              <CardDescription>Registered students</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-700">{totalStudents}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
                Total Incidents
              </CardTitle>
              <CardDescription>Detected violations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-amber-700">{totalIncidents}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="start-exam" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start-exam">Start Exam</TabsTrigger>
            <TabsTrigger value="active-exams">Exams</TabsTrigger>
          </TabsList>

          <TabsContent value="start-exam">
            <Card className="border-2 border-blue-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center">
                  <School className="mr-2 h-5 w-5 text-blue-600" />
                  Start New Exam
                </CardTitle>
                <CardDescription>Fill in the details to begin a new exam session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="room">Room Number</Label>
                  <Input
                      id="room"
                      placeholder="e.g. 401"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="focus-within:border-blue-400 focus-within:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                      id="subjectCode"
                      placeholder="e.g. CS101"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="focus-within:border-blue-400 focus-within:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                      id="subjectName"
                      placeholder="e.g. Artificial Intelligence"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="focus-within:border-blue-400 focus-within:ring-blue-200"
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
                <Button
                    onClick={handleStartExam}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Start Exam
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="active-exams">
            <Card className="border-2 border-blue-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
                  All Exams
                </CardTitle>
                <CardDescription>View and manage all exam sessions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : exams.length === 0 ? (
                    <div className="rounded-md border p-8 text-center">
                      <p className="text-muted-foreground">No exams found. Start an exam to see it here.</p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                          <TableRow>
                            <TableHead>Room</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Incidents</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exams.map((exam) => (
                              <TableRow key={exam.id} className="hover:bg-blue-50 transition-colors">
                                <TableCell className="font-medium">{exam.roomNumber}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{exam.subjectCode}</div>
                                  <div className="text-sm text-muted-foreground">{exam.subjectName}</div>
                                </TableCell>
                                <TableCell>{new Date(exam.startTime).toLocaleTimeString()}</TableCell>
                                <TableCell>
                                  <Badge
                                      variant={exam.status === "active" ? "default" : "secondary"}
                                      className={
                                        exam.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                                      }
                                  >
                                    {exam.status === "active" ? "Active" : "Completed"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{exam.studentsRegistered || 0}</TableCell>
                                <TableCell>
                                  {(exam.incidentsCount || 0) > 0 ? (
                                      <div className="flex items-center">
                                        <span className="mr-1">{exam.incidentsCount}</span>
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      </div>
                                  ) : (
                                      0
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                  >
                                    <Link href={`/exams/${exam.id}`}>
                                      <Eye className="h-4 w-4 mr-1" /> View
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
