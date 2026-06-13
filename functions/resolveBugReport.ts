import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated and is admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        const { bugReportId, status, severity, resolutionMessage, sendEmail } = await req.json();

        if (!bugReportId) {
            return Response.json({ error: 'Bug report ID is required' }, { status: 400 });
        }

        // Fetch the bug report
        const bugReports = await base44.asServiceRole.entities.BugReport.list();
        const bugReport = bugReports.find(b => b.id === bugReportId);

        if (!bugReport) {
            return Response.json({ error: 'Bug report not found' }, { status: 404 });
        }

        // Prepare update data
        const updateData = {
            status: status || bugReport.status,
            severity: severity || bugReport.severity
        };

        // If status is being changed to 'resolved' and resolution message provided
        if (status === 'resolved' && resolutionMessage) {
            updateData.resolution_message = resolutionMessage;
            updateData.resolved_date = new Date().toISOString();
            updateData.resolved_by_email = user.email;
        } else if (resolutionMessage) {
            // Allow updating resolution message even if not marking as resolved yet
            updateData.resolution_message = resolutionMessage;
        }

        // Update the bug report
        await base44.asServiceRole.entities.BugReport.update(bugReportId, updateData);

        // Send email notification if requested and resolution message exists
        if (sendEmail && resolutionMessage && bugReport.reporter_email) {
            try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: bugReport.reporter_email,
                    subject: `Update on Your Bug Report: ${bugReport.title}`,
                    body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(to right, #8B5CF6, #EC4899); padding: 20px; border-radius: 12px 12px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 24px;">Bug Report Update</h1>
                            </div>
                            
                            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                                <p style="color: #374151; font-size: 16px;">Hello ${bugReport.reporter_name || 'there'},</p>
                                
                                <p style="color: #374151; font-size: 16px;">Thank you for reporting an issue. Here's an update on your bug report:</p>
                                
                                <div style="background: #f3f4f6; border-left: 4px solid #8B5CF6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                    <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${bugReport.title}</h3>
                                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                        Status: <span style="font-weight: bold; color: ${status === 'resolved' ? '#10b981' : status === 'in_progress' ? '#3b82f6' : '#f59e0b'};">${status === 'resolved' ? '✅ Resolved' : status === 'in_progress' ? '🔄 In Progress' : status === 'wont_fix' ? '❌ Won\'t Fix' : '📋 Open'}</span>
                                    </p>
                                </div>
                                
                                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                    <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">💬 Response from our team:</h4>
                                    <p style="color: #1e3a8a; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${resolutionMessage}</p>
                                </div>
                                
                                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                                    If you have any additional questions or concerns, please don't hesitate to reach out.
                                </p>
                                
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                                
                                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                                    <strong style="color: #8B5CF6;">Eventpix QR</strong> - Thank you for helping us improve!
                                </p>
                            </div>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Failed to send resolution email:', emailError);
                // Don't fail the entire operation if email fails
            }
        }

        return Response.json({ 
            success: true,
            message: sendEmail && resolutionMessage ? 'Bug report updated and notification sent' : 'Bug report updated',
            bugReport: {
                id: bugReportId,
                status: updateData.status,
                emailSent: sendEmail && resolutionMessage ? true : false
            }
        });
    } catch (error) {
        console.error('Error resolving bug report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});