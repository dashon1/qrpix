import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.0.0';

// Helper function to add delay between emails
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate the user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, reminderType } = await req.json();

    console.log(`📧 Reminder request - Event: ${eventId}, Type: ${reminderType}, User: ${user.email}`);

    if (!eventId || !reminderType) {
      return Response.json({ 
        error: 'Missing required fields: eventId, reminderType' 
      }, { status: 400 });
    }

    // Fetch event details
    const events = await base44.asServiceRole.entities.Event.list();
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify user is host or co-host
    const isAuthorized = event.host_email === user.email || 
                        (event.co_hosts && event.co_hosts.includes(user.email));
    
    if (!isAuthorized) {
      return Response.json({ error: 'Not authorized to send reminders for this event' }, { status: 403 });
    }

    // Get all ticket holders
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id: eventId });
    
    console.log(`🎫 Found ${tickets.length} tickets for event ${event.name}`);
    
    // Get unique attendees (deduplicate by email)
    const attendeeEmails = new Set(tickets.map(t => t.attendee_email));
    const recipients = [...attendeeEmails];

    console.log(`👥 Unique recipients: ${recipients.length}`);

    if (recipients.length === 0) {
      return Response.json({ 
        success: true,
        message: 'No ticket holders found for this event',
        emailsSent: 0,
        emailsFailed: 0,
        totalRecipients: 0
      });
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    const failedEmails = [];
    const successfulEmails = [];

    const eventStartDate = event.start_date ? new Date(event.start_date) : null;
    const eventDate = eventStartDate ? format(eventStartDate, "EEEE, MMMM d, yyyy 'at' h:mm a") : "Date TBD";

    for (const recipientEmail of recipients) {
      try {
        console.log(`📤 Attempting to send to: ${recipientEmail}`);
        
        // Validate email format
        if (!recipientEmail || !recipientEmail.includes('@')) {
          throw new Error(`Invalid email format: ${recipientEmail}`);
        }

        // Get attendee's tickets
        const attendeeTickets = tickets.filter(t => t.attendee_email === recipientEmail);
        const firstTicket = attendeeTickets[0];
        const totalQuantity = attendeeTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

        let emailBody = '';
        let subject = '';

        if (reminderType === 'day_before') {
          const ticketsRemaining = event.max_tickets ? event.max_tickets - (event.tickets_sold || 0) : null;
          
          subject = `Reminder: ${event.name} is Tomorrow!`;
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #faf5ff, #fce7f3); padding: 20px; border-radius: 12px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ${event.cover_image_url ? `
                  <div style="width: 100%; height: 200px; overflow: hidden;">
                    <img src="${event.cover_image_url}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                ` : ''}
                
                <div style="padding: 30px;">
                  <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
                    Tomorrow's the Day! 🎉
                  </h1>
                  
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 15px 0;">
                    Hi ${firstTicket.attendee_name || 'there'}! We're excited to see you tomorrow at <strong>${event.name}</strong>!
                  </p>
                  
                  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 15px 0;">
                      📅 Event Details
                    </h3>
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">🕒 When</span>
                      <span style="color: #111827; font-size: 15px; font-weight: 500;">${eventDate}</span>
                    </div>
                    
                    ${event.location_address ? `
                      <div style="margin-bottom: 12px;">
                        <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">📍 Where</span>
                        <span style="color: #111827; font-size: 15px; font-weight: 500;">${event.location_address}</span>
                      </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">🎫 Your Tickets</span>
                      <span style="color: #111827; font-size: 15px; font-weight: 500;">${totalQuantity} ticket(s)</span>
                    </div>
                  </div>
                  
                  ${ticketsRemaining !== null ? `
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                      <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: bold;">
                        ⚡ Only ${ticketsRemaining} tickets remaining!
                      </p>
                      <p style="color: #78350f; font-size: 13px; margin: 5px 0 0 0;">
                        Spots are filling up fast. Tell your friends to grab their tickets now!
                      </p>
                    </div>
                  ` : ''}
                  
                  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong>💡 Quick Tips:</strong><br/>
                      • Arrive 15 minutes early<br/>
                      • Bring your ticket (check your email)<br/>
                      • Share photos using our QR codes at the event!
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${event.qr_code_data || '#'}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      View Event Details
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
                    See you tomorrow! 🎊
                  </p>
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                Powered by <strong style="color: #8B5CF6;">Eventpix QR</strong>
              </p>
            </div>
          `;
        } else if (reminderType === '4_hours_before') {
          subject = `${event.name} Starts in 4 Hours! 🎉`;
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #faf5ff, #fce7f3); padding: 20px; border-radius: 12px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ${event.cover_image_url ? `
                  <div style="width: 100%; height: 200px; overflow: hidden;">
                    <img src="${event.cover_image_url}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                ` : ''}
                
                <div style="padding: 30px;">
                  <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
                    It's Almost Time! ⏰
                  </h1>
                  
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 15px 0;">
                    Hi ${firstTicket.attendee_name || 'there'}! <strong>${event.name}</strong> starts in just 4 hours. Here's everything you need to know:
                  </p>
                  
                  <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: bold;">
                      🚨 Action Required: Bring Your Ticket!
                    </p>
                  </div>
                  
                  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 15px 0;">
                      📋 Event Information
                    </h3>
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">🕒 Start Time</span>
                      <span style="color: #111827; font-size: 15px; font-weight: 500;">${eventDate}</span>
                    </div>
                    
                    ${event.location_address ? `
                      <div style="margin-bottom: 12px;">
                        <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">📍 Location</span>
                        <span style="color: #111827; font-size: 15px; font-weight: 500;">${event.location_address}</span>
                        <br/>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}" style="color: #8B5CF6; text-decoration: none; font-size: 13px; margin-top: 4px; display: inline-block;">
                          📍 Get Directions →
                        </a>
                      </div>
                    ` : ''}
                  </div>
                  
                  ${attendeeTickets.length > 0 ? `
                    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); border-radius: 12px; padding: 20px; margin: 25px 0; color: white; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">🎫 Your Ticket(s)</h3>
                      ${attendeeTickets.map(ticket => `
                        <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                          <div style="font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;">
                            ${ticket.ticket_code}
                          </div>
                          <div style="font-size: 13px; opacity: 0.9;">
                            Quantity: ${ticket.quantity || 1} • Status: ${ticket.status}
                          </div>
                        </div>
                      `).join('')}
                      <p style="font-size: 12px; opacity: 0.9; margin: 15px 0 0 0;">
                        💡 Show this code at check-in or save this email to your phone
                      </p>
                    </div>
                  ` : ''}
                  
                  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                      📸 At the Event:
                    </p>
                    <ul style="color: #1e40af; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                      <li>Look for QR codes around the venue</li>
                      <li>Scan to upload and view photos in real-time</li>
                      <li>Share memories with other attendees</li>
                      <li>Download your favorite photos instantly</li>
                    </ul>
                  </div>
                  
                  ${event.max_tickets ? `
                    <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Attendance Status</p>
                      <p style="color: #111827; font-size: 18px; font-weight: bold; margin: 0;">
                        ${event.tickets_sold || 0} / ${event.max_tickets} guests confirmed
                      </p>
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${event.qr_code_data || '#'}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      View Full Event Details
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
                    Can't wait to see you there! 🎊
                  </p>
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                Powered by <strong style="color: #8B5CF6;">Eventpix QR</strong>
              </p>
            </div>
          `;
        } else {
          return Response.json({ error: 'Invalid reminderType. Use "day_before" or "4_hours_before"' }, { status: 400 });
        }

        const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: subject,
          body: emailBody
        });
        
        console.log(`✅ Successfully sent reminder to ${recipientEmail}`, emailResult);
        emailsSent++;
        successfulEmails.push({
          email: recipientEmail,
          name: firstTicket.attendee_name
        });
        
        // Add 200ms delay between emails to avoid rate limiting
        await delay(200);
      } catch (emailError) {
        const errorMessage = emailError.message || String(emailError);
        console.error(`❌ Failed to send reminder to ${recipientEmail}:`, emailError);
        emailsFailed++;
        failedEmails.push({
          email: recipientEmail,
          error: errorMessage,
          fullError: String(emailError)
        });
      }
    }

    const result = {
      success: true,
      emailsSent,
      emailsFailed,
      totalRecipients: recipients.length,
      failedEmails,
      successfulEmails,
      reminderType,
      eventName: event.name
    };

    console.log(`📊 Final results:`, result);

    return Response.json(result);

  } catch (error) {
    console.error('❌ Critical error sending event reminders:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});