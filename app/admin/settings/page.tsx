"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">System configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>Configure AI providers and default model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push("/admin/models")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Models
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
