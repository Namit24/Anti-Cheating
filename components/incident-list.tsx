"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

type Incident = {
  id: string
  studentId: string
  studentName: string
  rollNumber: string
  examId: string
  incidentType: string
  details: string
  timestamp: string
  screenshot?: string
}

export function IncidentList({ examId }: { examId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const fetchIncidents = async () => {
    try {
      const response = await fetch(`/api/incidents?examId=${examId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch incidents")
      }
      const data = await response.json()
      setIncidents(data)
    } catch (error) {
      console.error("Error fetching incidents:", error)
      toast({
        title: "Error",
        description: "Failed to load incidents.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()

    // Set up polling to refresh every 5 seconds
    const interval = setInterval(fetchIncidents, 5000)
    return () => clearInterval(interval)
  }, [examId])

  const getIncidentTypeLabel = (type: string) => {
    switch (type) {
      case "copy_paste":
        return "Copy-Paste Detected"
      case "blocked_site":
        return "Blocked Website Visit"
      case "extension_disabled":
        return "Extension Disabled"
      case "extension_removed":
        return "Extension Removed"
      case "extension_reactivated":
        return "Extension Reactivated"
      case "extension_started":
        return "Extension Started"
      case "extension_stopped":
        return "Extension Stopped"
      case "tab_switch":
        return "Tab/Window Switch"
      case "nlp_suspicious":
        return "Suspicious Code Pattern"
      default:
        return type
    }
  }

  const getIncidentSeverity = (type: string) => {
    switch (type) {
      case "blocked_site":
      case "extension_disabled":
      case "extension_removed":
        return "high"
      case "copy_paste":
      case "nlp_suspicious":
        return "medium"
      case "tab_switch":
        return "low"
      default:
        return "info"
    }
  }

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "warning"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-12" />
          ))}
        </div>
    )
  }

  if (incidents.length === 0) {
    return (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No incidents have been detected for this exam yet.</p>
        </div>
    )
  }

  return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Incident Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => {
              const severity = getIncidentSeverity(incident.incidentType)
              return (
                  <TableRow
                      key={incident.id}
                      className={severity === "high" ? "bg-red-50" : severity === "medium" ? "bg-amber-50" : ""}
                  >
                    <TableCell className="font-medium">{incident.studentName}</TableCell>
                    <TableCell>{incident.rollNumber}</TableCell>
                    <TableCell>{getIncidentTypeLabel(incident.incidentType)}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(severity)}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </Badge>
                    </TableCell>
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
                                    <pre className="text-sm whitespace-pre-wrap">{incident.details}</pre>
                                  </ScrollArea>
                                </div>
                                {incident.screenshot && (
                                    <div>
                                      <h4 className="text-sm font-medium">Screenshot Evidence</h4>
                                      <div className="mt-2 border rounded-md overflow-hidden">
                                        <img
                                            src={incident.screenshot || "/placeholder.svg"}
                                            alt="Incident Screenshot"
                                            className="w-full h-auto"
                                        />
                                      </div>
                                    </div>
                                )}
                              </div>
                            </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
  )
}
