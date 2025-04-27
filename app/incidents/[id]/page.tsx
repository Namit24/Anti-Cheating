"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type Incident = {
  id: string
  studentName: string
  rollNumber: string
  examId: string
  incidentType: string
  details: string
  timestamp: string
}

export default function IncidentDetails() {
  const params = useParams()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [examInfo, setExamInfo] = useState<{ subjectName: string; roomNumber: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        // Fetch incidents for this exam
        const response = await fetch(`/api/incidents?examId=${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch incidents")
        const data = await response.json()
        setIncidents(data)

        // Fetch exam info
        const examResponse = await fetch(`/api/exams/${params.id}`)
        if (!examResponse.ok) throw new Error("Failed to fetch exam info")
        const examData = await examResponse.json()
        setExamInfo(examData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [params.id])

  const getIncidentTypeLabel = (type: string) => {
    switch (type) {
      case "copy_paste":
        return "Copy-Paste Detected"
      case "blocked_site":
        return "Blocked Website Visit"
      case "extension_disabled":
        return "Extension Disabled"
      case "nlp_suspicious":
        return "Suspicious Code Pattern"
      default:
        return type
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading incident details...</div>
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Exam Incidents</h1>
      </div>

      {examInfo && (
        <Card>
          <CardHeader>
            <CardTitle>{examInfo.subjectName}</CardTitle>
            <CardDescription>Room {examInfo.roomNumber}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detected Incidents</CardTitle>
          <CardDescription>All suspicious activities detected during this exam</CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No incidents have been detected for this exam.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Incident Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">{incident.studentName}</TableCell>
                    <TableCell>{incident.rollNumber}</TableCell>
                    <TableCell>{getIncidentTypeLabel(incident.incidentType)}</TableCell>
                    <TableCell>{new Date(incident.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedIncident(incident)}>
                            <Eye className="h-4 w-4 mr-1" /> Details
                          </Button>
                        </DialogTrigger>
                        {selectedIncident && (
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Incident Details</DialogTitle>
                              <DialogDescription>
                                {incident.studentName} ({incident.rollNumber})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium">Incident Type</h4>
                                <p>{getIncidentTypeLabel(incident.incidentType)}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Time</h4>
                                <p>{new Date(incident.timestamp).toLocaleString()}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Details</h4>
                                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                  <pre className="text-sm">{incident.details}</pre>
                                </ScrollArea>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
