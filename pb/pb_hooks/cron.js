/// <reference path="../pb_data/types.d.ts" />

// Auto-delete DONE tasks every day at 07:00 WIB (UTC+7)
// PocketBase cron uses UTC timezone, so 07:00 WIB = 00:00 UTC
// Cron expression: minute(0) hour(0) day(*) month(*) weekday(*)
cronAdd("auto_delete_done_tasks", "0 0 * * *", () => {
  console.log("[Cron] Running auto-delete DONE tasks check")

  try {
    // Tasks are identified by notes containing '[TASK_ASSIGNED_TO]'
    // Find all DONE tasks using the database query builder
    const result = $app.db()
      .select("id")
      .from("content_plan")
      .where($dbx.and(
        $dbx.like("notes", "[TASK_ASSIGNED_TO]"),
        $dbx.hashExp({ status: "DONE" })
      ))
      .all(arrayOf(new DynamicModel({ "id": "" })))

    if (result.length > 0) {
      console.log(`[Cron] Found ${result.length} DONE tasks to delete`)
      result.forEach(row => {
        try {
          $app.delete($app.findRecordById("content_plan", row.id))
          console.log(`[Cron] Deleted task: ${row.id}`)
        } catch (e) {
          console.error(`[Cron] Failed to delete task ${row.id}:`, e)
        }
      })
      console.log(`[Cron] Auto-deleted ${result.length} DONE tasks`)
    } else {
      console.log("[Cron] No DONE tasks to delete")
    }
  } catch (err) {
    console.error("[Cron] Error auto-deleting tasks:", err)
  }
})