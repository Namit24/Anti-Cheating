"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"

type Student = {
  id: string
  name: string
  rollNumber: string
  roomNumber: string
  examId: string
  status: string
  lastActive: string
  incidentCount: number
  extensionActive: boolean
  lastHeartbeat?: string
}

export function StudentList({ examId }: { examId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/students?examId=${examId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch students")
      }
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "Error",
        description: "Failed to load students.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()

    // Set up polling to refresh every 10 seconds
    const interval = setInterval(fetchStudents, 10000)
    return () => clearInterval(interval)
  }, [examId])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center">
        <p className="text-muted-foreground">No students have registered for this exam yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Roll Number</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Extension</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Incidents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            // Check if extension is likely disabled (no heartbeat in last 45 seconds)
            const extensionInactive =
              !student.extensionActive ||
              (student.lastHeartbeat && Date.now() - new Date(student.lastHeartbeat).getTime() > 45000)

            return (
              <TableRow key={student.id} className={extensionInactive ? "bg-red-50" : ""}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.rollNumber}</TableCell>
                <TableCell>{student.roomNumber}</TableCell>
                <TableCell>
                  <Badge variant={student.status === "active" ? "success" : "destructive"}>
                    {student.status === "active" ? "Online" : "Offline"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={extensionInactive ? "destructive" : "success"}>
                    {extensionInactive ? "Inactive" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>{student.lastActive ? new Date(student.lastActive).toLocaleTimeString() : "N/A"}</TableCell>
                <TableCell>
                  {(student.incidentCount || 0) > 0 ? (
                    <div className="flex items-center">
                      <span className="mr-1">{student.incidentCount}</span>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                  ) : (
                    0
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
