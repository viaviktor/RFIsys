'use client'

import { useState } from 'react'
import { useReminderSummary, useReminderActions } from '@/hooks/useReminders'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'

export function ReminderManager() {
  const { summary, isLoading, error, refresh } = useReminderSummary()
  const { processAllReminders, testReminderSystem } = useReminderActions()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const handleProcessReminders = async () => {
    setIsProcessing(true)
    try {
      const result = await processAllReminders()
      setLastResult(result)
      await refresh() // Refresh the summary
      console.log('Reminder processing completed:', result)
    } catch (error) {
      console.error('Failed to process reminders:', error)
      alert('Failed to process reminders: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTestSystem = async () => {
    setIsTesting(true)
    try {
      const result = await testReminderSystem()
      setLastResult(result)
      await refresh() // Refresh the summary
      console.log('Reminder system test completed:', result)
    } catch (error) {
      console.error('Failed to test reminder system:', error)
      alert('Failed to test reminder system: ' + (error as Error).message)
    } finally {
      setIsTesting(false)
    }
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
        <h2 className="text-xl font-bold text-steel-900 mb-4">RFI Reminder System</h2>
        <div className="alert-error">
          <div className="font-medium">Error loading reminder data: {error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-steel border border-steel-200">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-steel-900">RFI Reminder System</h2>
            <p className="text-steel-600">
              Automated email reminders for RFI due dates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-lg">⏰</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Due Tomorrow</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {isLoading ? '...' : summary?.dueTomorrow || 0} RFIs
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">🚨</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Overdue</h3>
                <p className="text-2xl font-bold text-red-600">
                  {isLoading ? '...' : summary?.overdue || 0} RFIs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="primary"
            onClick={handleProcessReminders}
            disabled={isProcessing || isLoading}
            isLoading={isProcessing}
          >
            {isProcessing ? 'Processing Reminders...' : 'Process All Reminders'}
          </Button>

          <Button
            variant="outline"
            onClick={handleTestSystem}
            disabled={isTesting || isLoading}
            isLoading={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test System'}
          </Button>
        </div>

        {/* Last Updated */}
        {summary?.timestamp && (
          <div className="text-sm text-steel-600 mb-6">
            Last updated: {format(new Date(summary.timestamp), 'MMM d, yyyy h:mm a')}
          </div>
        )}

        {/* Results Display */}
        {lastResult && (
          <div className="border-t border-steel-200 pt-6">
            <h3 className="text-lg font-semibold text-steel-900 mb-4">Last Processing Results</h3>
            
            {lastResult.dueTomorrowReminders && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Due Tomorrow Reminders</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-yellow-600">Total:</span> {lastResult.dueTomorrowReminders.count}
                  </div>
                  <div>
                    <span className="text-green-600">Success:</span> {lastResult.dueTomorrowReminders.success}
                  </div>
                  <div>
                    <span className="text-red-600">Failed:</span> {lastResult.dueTomorrowReminders.failed}
                  </div>
                </div>
                {lastResult.dueTomorrowReminders.rfis.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-yellow-700">RFIs: </span>
                    <span className="text-sm text-steel-700">
                      {lastResult.dueTomorrowReminders.rfis.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {lastResult.overdueReminders && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Overdue Reminders</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-600">Total:</span> {lastResult.overdueReminders.count}
                  </div>
                  <div>
                    <span className="text-green-600">Success:</span> {lastResult.overdueReminders.success}
                  </div>
                  <div>
                    <span className="text-red-600">Failed:</span> {lastResult.overdueReminders.failed}
                  </div>
                </div>
                {lastResult.overdueReminders.rfis.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-red-700">RFIs: </span>
                    <span className="text-sm text-steel-700">
                      {lastResult.overdueReminders.rfis.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {lastResult.success !== undefined && (
              <div className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`font-semibold ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {lastResult.success ? '✅ Success' : '❌ Failed'}
                </div>
                <div className={`text-sm mt-1 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {lastResult.message || lastResult.error}
                  {lastResult.details && (
                    <div className="mt-2 text-xs opacity-75">
                      Details: {lastResult.details}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cron Schedule Info */}
        <div className="border-t border-steel-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-steel-900 mb-2">Automated Schedule</h3>
          <div className="text-sm text-steel-600">
            <p>• Daily reminders run automatically at <strong>8:00 AM Eastern Time</strong></p>
            <p>• RFIs due tomorrow receive a reminder notification</p>
            <p>• Overdue RFIs receive daily reminder notifications</p>
            <p>• Notifications are sent to all project stakeholders</p>
          </div>
        </div>
      </div>
    </div>
  )
}