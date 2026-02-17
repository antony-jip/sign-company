import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

interface AIInsight {
  id: string
  message: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  actionLabel: string
  href: string
}

const insights: AIInsight[] = [
  {
    id: '1',
    message: "Project 'Website Redesign' loopt 2 dagen voor op schema",
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    actionLabel: 'Bekijk project',
    href: '/projecten',
  },
  {
    id: '2',
    message: '3 offertes verlopen binnen 7 dagen - actie vereist',
    icon: AlertTriangle,
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    actionLabel: 'Bekijk offertes',
    href: '/offertes',
  },
  {
    id: '3',
    message: 'Klant TechNova heeft 30 dagen geen contact gehad',
    icon: Clock,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    actionLabel: 'Neem contact op',
    href: '/klanten',
  },
]

export function AIInsightWidget() {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span>AI Inzichten</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 rounded-lg p-3 ${insight.iconBg} transition-colors duration-150`}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${insight.iconColor}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                  {insight.message}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1 text-xs font-medium"
                  onClick={() => navigate(insight.href)}
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
