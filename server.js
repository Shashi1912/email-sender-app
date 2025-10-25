const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration loaded from your Config.xml values
const EMAIL_CONFIG = {
    senderEmail: 'angajalashashikumar@gmail.com',
    appPassword: 'sttdyiofulhftvzg',
    subject: 'Application: Software Test Engineer – Angajala Shashikumar',

    // OPTION 1: If resume is uploaded to GitHub repository
    resumePath: './Angajala_Shaskikumar_QA_Resume.pdf',

    // OPTION 2: If resume is hosted online (Google Drive, Dropbox, etc.)
    // Uncomment and use this instead of resumePath
    // resumeUrl: 'YOUR_DIRECT_DOWNLOAD_URL_HERE',

    emailBody: \`Hi,

I am writing to express my interest in the Software Test Engineer position. I am enthusiastic about contributing to a team that values quality engineering, testing, and automation.

With over 4 years of experience in QA, I have worked on automation using Selenium with Java, and I have improved testing efficiency by building reliable automation suites. My experience includes functional testing, automation framework development, and testing simulation-based applications using Unreal Engine, all in Agile and Scrum environments.

Core Skills & Tools
• Automation Tools: Selenium WebDriver, Winnium
• Frameworks: Hybrid, TestNG, POM-based automation frameworks
• Programming Languages: Java, SQL
• Applications: Unreal Engine (4.2 & 5.1), Eclipse
• Testing Methodologies: Functional, Regression, Endurance, UAT
• Soft Skills: Communication, Team Collaboration, Adaptability, Analytical Thinking

Key Achievements
• Built and maintained automation suites to improve testing efficiency
• Recognized for delivering high-impact testing projects
• Collaborated with cross-functional teams to deliver simulation systems for complex applications

I am looking to grow in a QA team where technical skills, initiative, and teamwork are valued. My resume is attached, and I would be happy to provide additional details if needed.

Thank you for your time and consideration.

Warm regards,
Angajala Shashikumar
📍 Hyderabad, India
📞 +91 88019 54605
✉️ angajalashashikumar@gmail.com
🔗 LinkedIn: linkedin.com/in/shashikumar-angajala-19937a20a
🔗 GitHub: github.com/shashikumar-angajala\`
};

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_CONFIG.senderEmail,
        pass: EMAIL_CONFIG.appPassword
    }
});

// Function to download file from URL
function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (response) => {
            if (response.statusCode === 200) {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
            } else {
                reject(new Error(\`Failed to download: \${response.statusCode}\`));
            }
        }).on('error', reject);
    });
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'running', 
        message: 'Email Sender Backend Server is running on Render.com',
        config: {
            from: EMAIL_CONFIG.senderEmail,
            hasResume: EMAIL_CONFIG.resumePath || EMAIL_CONFIG.resumeUrl ? true : false
        },
        timestamp: new Date().toISOString()
    });
});

// Send single email endpoint
app.post('/send-email', async (req, res) => {
    try {
        const { recipientEmail } = req.body;

        if (!recipientEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Recipient email is required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        let attachmentOptions;

        // Handle resume attachment
        if (EMAIL_CONFIG.resumeUrl) {
            // Download from URL
            try {
                const fileBuffer = await downloadFile(EMAIL_CONFIG.resumeUrl);
                attachmentOptions = {
                    filename: 'Angajala_Shaskikumar_QA_Resume.pdf',
                    content: fileBuffer
                };
            } catch (error) {
                console.error('Failed to download resume from URL:', error);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Failed to download resume from URL: ' + error.message 
                });
            }
        } else if (EMAIL_CONFIG.resumePath) {
            // Use local file
            if (!fs.existsSync(EMAIL_CONFIG.resumePath)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Resume file not found at: ' + EMAIL_CONFIG.resumePath 
                });
            }
            attachmentOptions = {
                filename: path.basename(EMAIL_CONFIG.resumePath),
                path: EMAIL_CONFIG.resumePath
            };
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'No resume configured. Please set resumePath or resumeUrl.' 
            });
        }

        // Email options
        const mailOptions = {
            from: EMAIL_CONFIG.senderEmail,
            to: recipientEmail,
            subject: EMAIL_CONFIG.subject,
            text: EMAIL_CONFIG.emailBody,
            attachments: [attachmentOptions]
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent to:', recipientEmail);
        console.log('Message ID:', info.messageId);

        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: info.messageId,
            recipient: recipientEmail
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email',
            error: error.message 
        });
    }
});

// Send bulk emails endpoint
app.post('/send-bulk-emails', async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Emails array is required' 
            });
        }

        // Limit to 50 emails
        const emailsToSend = emails.slice(0, 50);
        const results = [];

        // Prepare resume attachment once
        let attachmentOptions;

        if (EMAIL_CONFIG.resumeUrl) {
            try {
                const fileBuffer = await downloadFile(EMAIL_CONFIG.resumeUrl);
                attachmentOptions = {
                    filename: 'Angajala_Shaskikumar_QA_Resume.pdf',
                    content: fileBuffer
                };
            } catch (error) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Failed to download resume from URL: ' + error.message 
                });
            }
        } else if (EMAIL_CONFIG.resumePath) {
            if (!fs.existsSync(EMAIL_CONFIG.resumePath)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Resume file not found at: ' + EMAIL_CONFIG.resumePath 
                });
            }
            attachmentOptions = {
                filename: path.basename(EMAIL_CONFIG.resumePath),
                path: EMAIL_CONFIG.resumePath
            };
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'No resume configured.' 
            });
        }

        for (const recipientEmail of emailsToSend) {
            try {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(recipientEmail.trim())) {
                    results.push({
                        email: recipientEmail,
                        success: false,
                        message: 'Invalid email format'
                    });
                    continue;
                }

                // Email options
                const mailOptions = {
                    from: EMAIL_CONFIG.senderEmail,
                    to: recipientEmail.trim(),
                    subject: EMAIL_CONFIG.subject,
                    text: EMAIL_CONFIG.emailBody,
                    attachments: [attachmentOptions]
                };

                const info = await transporter.sendMail(mailOptions);

                results.push({
                    email: recipientEmail,
                    success: true,
                    messageId: info.messageId
                });

                console.log(\`✅ Email sent to: \${recipientEmail}\`);

                // Add delay between emails to avoid rate limiting (1 second)
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                results.push({
                    email: recipientEmail,
                    success: false,
                    message: error.message
                });
                console.error(\`❌ Failed to send to \${recipientEmail}:\`, error.message);
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        res.json({ 
            success: true,
            totalSent: successCount,
            totalFailed: failCount,
            results: results
        });

    } catch (error) {
        console.error('Error sending bulk emails:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send bulk emails',
            error: error.message 
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(\`\n✅ Email Sender Backend Server is running\`);
    console.log(\`📧 Sender Email: \${EMAIL_CONFIG.senderEmail}\`);
    console.log(\`📎 Resume: \${EMAIL_CONFIG.resumePath || EMAIL_CONFIG.resumeUrl || 'Not configured'}\`);
    console.log(\`🌐 Port: \${PORT}\`);
    console.log(\`\n🚀 Server is ready to send emails!\`);
    console.log(\`⏰ Server started at: \${new Date().toISOString()}\`);
});
