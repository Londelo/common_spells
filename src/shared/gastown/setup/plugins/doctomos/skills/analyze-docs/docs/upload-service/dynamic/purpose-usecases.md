# Use Cases & Workflows - upload-service

## Primary Use Cases

### Use Case 1: Admin Uploads Marketing Image for Event

**Actor**: Marketing Admin (Supreme User)

**Goal**: Upload an event promotion image to be publicly accessible for web display

**Preconditions**:
- User authenticated with Supreme privileges
- Valid base64-encoded image (gif, png, or jpeg)

**Main Flow**:
1. User encodes image to base64 in admin interface
2. User submits POST /images with base64 content, contentType, and optional fileName
3. Service validates content type against allowed formats (gif/png/jpeg)
4. Service generates unique filename with UUID to prevent collisions
5. Service uploads to configured images S3 bucket with cache control headers
6. Service returns S3 URL for image
7. User stores URL in event database for display on website

**Postconditions**:
- Image available at S3 URL with public access
- Image stored with appropriate cache headers
- Unique filename prevents overwrites

**Business Rules Applied**:
- Only image/gif, image/png, image/jpeg accepted
- Filename gets UUID appended for uniqueness
- Default cache control is 'no-cache' unless specified

---

### Use Case 2: Upload CSV File for SMS Wave Processing

**Actor**: Campaign Manager (Supreme User)

**Goal**: Upload a CSV file containing phone numbers and campaign data for SMS wave sending

**Preconditions**:
- User authenticated with Supreme privileges
- Valid CSV file with campaign recipient data
- File size within configured limit

**Main Flow**:
1. User selects CSV file in admin interface
2. User specifies target folder prefix (e.g., "notification-scheduler/campaign-123")
3. User submits POST /files with file upload, prefix, and bucketName
4. Service validates file is not empty
5. Service normalizes prefix to ensure folder structure
6. Service uploads to specified bucket (or default files bucket)
7. Service stores with private ACL for security
8. Service returns S3 URL
9. Campaign manager triggers wave processing via trigger endpoint

**Postconditions**:
- CSV file stored in S3 at specified prefix/folder
- File accessible only with proper credentials (private ACL)
- File available for downstream Lambda processing

**Business Rules Applied**:
- Empty files rejected
- Prefix auto-normalized with trailing slash
- Files stored with private ACL
- Supreme user authentication required

---

### Use Case 3: List and Review Files in Campaign Folder

**Actor**: Campaign Admin (Supreme User)

**Goal**: View all files uploaded for a specific campaign and check their metadata

**Preconditions**:
- User authenticated with Supreme privileges
- Files exist in target S3 bucket prefix

**Main Flow**:
1. User navigates to file browser in admin interface
2. User enters prefix/folder path (e.g., "notification-scheduler/campaign-123")
3. User calls GET /files/list?prefix={prefix}&bucketName={bucket}
4. Service queries S3 for objects matching prefix
5. Service sorts results by LastModified date (newest first)
6. Service returns list with key and date for each file
7. User views list of files with timestamps

**Postconditions**:
- User has list of files in folder
- Files sorted by modification date
- No file content retrieved (metadata only)

**Business Rules Applied**:
- Results sorted descending by LastModified
- Supreme user authentication required
- Bucket defaults to configured files bucket if not specified

---

### Use Case 4: Retrieve and Parse CSV File Contents

**Actor**: Support Admin (Supreme User)

**Goal**: View contents of a CSV file directly in admin interface without downloading

**Preconditions**:
- User authenticated with Supreme privileges
- CSV or JSON file exists in S3
- File size under 1MB limit

**Main Flow**:
1. User navigates to file browser and locates target file
2. User requests file content view
3. System calls GET /files/list/data?prefix={prefix}&bucketName={bucket}&skip=0&limit=10
4. Service lists and sorts files by prefix
5. Service applies pagination (skip/limit)
6. For each file, service determines file type from extension
7. Service downloads file content from S3
8. Service parses CSV using csv-parse library with column headers
9. Service returns parsed data as JSON array
10. User views structured data in table format

**Postconditions**:
- File contents displayed in structured format
- No local download required
- Data ready for review or validation

**Business Rules Applied**:
- Only CSV and JSON files parsed
- Files over 1MB return error message
- Unsupported file types return error message
- Parse failures return graceful error
- Pagination applied after sorting

---

### Use Case 5: Delete Files After Campaign Completion

**Actor**: Campaign Admin (Supreme User)

**Goal**: Clean up uploaded files after campaign ends to manage storage costs

**Preconditions**:
- User authenticated with Supreme privileges
- Files exist in target bucket
- User has list of file keys to delete

**Main Flow**:
1. User identifies files to delete (from list view)
2. User selects multiple files in admin interface
3. User confirms deletion action
4. System calls DELETE /files?fileKeys={key1,key2,key3}&bucketName={bucket}
5. Service parses comma-separated file keys
6. Service validates at least one key provided
7. Service calls S3 deleteObjects for batch deletion
8. Service returns list of deleted file keys
9. User receives confirmation of deleted files

**Postconditions**:
- Files removed from S3 bucket
- Storage space freed
- Audit log records deletion event

**Business Rules Applied**:
- At least one file key required
- Keys parsed from comma-separated string
- Supreme user authentication required
- Deletion failures return error without partial success

---

### Use Case 6: Trigger CCPA Data Deletion Request

**Actor**: CCPA Compliance System (Automated - No Auth Required)

**Goal**: Initiate user data deletion workflow to comply with privacy regulations

**Preconditions**:
- CCPA deletion request received
- Request data contains user identifiers

**Main Flow**:
1. Compliance system receives CCPA deletion request
2. System formats request data as JSON payload
3. System calls POST /trigger/ccpa with request data
4. Service validates data is not empty
5. Service invokes processCcpaRequestLambda with payload
6. Lambda processes deletion across systems
7. Service returns success:true response
8. Compliance system logs trigger completion

**Postconditions**:
- Lambda execution started
- User data deletion workflow initiated
- Compliance system has confirmation

**Business Rules Applied**:
- CCPA trigger does NOT require authentication (compliance exception)
- Empty data rejected
- Failures return success:false without error

---

### Use Case 7: Trigger SMS Wave File Processing

**Actor**: Campaign Admin (Supreme User)

**Goal**: Start processing of uploaded SMS wave files to send campaign messages

**Preconditions**:
- User authenticated with Supreme privileges
- CSV files uploaded with phone numbers and campaign data
- Campaign configured and ready to send

**Main Flow**:
1. User confirms campaign files uploaded correctly
2. User clicks "Start Wave Processing" in admin interface
3. System calls POST /trigger/waveprep with campaign parameters
4. Service validates user is Supreme
5. Service validates data payload present
6. Service invokes processSmsWaveFilesLambda with parameters
7. Lambda begins processing files and sending SMS messages
8. Service returns success:true
9. User monitors campaign progress in separate dashboard

**Postconditions**:
- Lambda execution started
- SMS wave processing initiated
- Campaign marked as "processing"

**Business Rules Applied**:
- Supreme user authentication required
- Data payload must not be empty
- Invalid trigger function name returns error
- Lambda failures return success:false

## User Journey Map

**Campaign Manager Flow:**
1. Manager plans SMS campaign
2. Prepares recipient CSV with phone numbers and custom fields
3. Logs into admin interface with Supreme credentials
4. Navigates to file upload section
5. Uploads CSV to designated campaign folder
6. Reviews uploaded files via list endpoint
7. Verifies file contents via list/data endpoint
8. Triggers wave processing when ready
9. Monitors campaign progress
10. Cleans up files after campaign completes

**Marketing Admin Flow:**
1. Designer creates event promotional image
2. Admin logs into system with Supreme credentials
3. Converts image to base64 in upload interface
4. Uploads image with cache control settings
5. Receives S3 URL
6. Stores URL in event management system
7. Image displays on public event pages

**Compliance System Flow:**
1. User submits CCPA deletion request via form
2. Compliance system validates request
3. System triggers upload-service CCPA endpoint (no auth)
4. Lambda processes deletion across all services
5. System logs completion
6. User receives confirmation email

## Key Workflows

### Workflow 1: File Upload and Validation Pipeline

1. **Request Received**: API receives upload request with file data
2. **Authentication Check**: Verify JWT token contains Supreme user flag
3. **Input Validation**: Check file not empty, content type allowed, size within limits
4. **Bucket Selection**: Determine target bucket (explicit or default)
5. **Credential Resolution**: Standard AWS creds or STS assume role for TMOL
6. **S3 Upload**: Upload file with ACL=private, cache-control headers
7. **Response**: Return S3 URL and filename to caller

### Workflow 2: File Listing and Content Retrieval

1. **Request Received**: API receives list/data request with prefix
2. **Authentication Check**: Verify Supreme user status
3. **Bucket Connection**: Initialize S3 client for target bucket
4. **Query S3**: List objects by prefix
5. **Sort Results**: Order by LastModified descending
6. **Apply Pagination**: Slice results by skip/limit
7. **Parse Content** (list/data only): Download and parse CSV/JSON files
8. **Handle Errors**: Return graceful errors for oversized or unsupported files
9. **Response**: Return file metadata or parsed content

### Workflow 3: Lambda/Step Function Triggering

1. **Request Received**: POST /trigger/{function} with data payload
2. **Auth Check**: Verify Supreme user (except CCPA function)
3. **Function Mapping**: Look up AWS client config from trigger name
4. **Validate Data**: Ensure payload is not empty
5. **Client Initialization**: Create Lambda or StepFunction client
6. **Invoke**: Call invoke() with payload
7. **Error Handling**: Catch failures and return success:false
8. **Response**: Return success status

## Example Scenarios

**Scenario 1: Marketing Team Launches Concert Promotion**
- Marketing creates hero image for concert page
- Admin encodes image to base64
- Uploads via POST /images with contentType="image/jpeg", fileName="concert-hero.jpg"
- Service generates "concert-hero_a3f8b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o.jpg"
- Uploads to images bucket with cache control "public, max-age=31536000"
- Returns URL: https://images-bucket.s3.amazonaws.com/concert-hero_a3f8b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o.jpg
- Marketing stores URL in CMS
- Image loads on public concert page with 1-year cache

**Scenario 2: Campaign Team Sends SMS Wave to 50,000 Fans**
- Campaign manager exports recipient list as CSV (50,000 rows)
- CSV includes: phone, firstName, eventDate, venueName
- Uploads via POST /files to prefix="sms-waves/campaign-456"
- File stored: s3://files-bucket/sms-waves/campaign-456/recipients.csv
- Manager reviews file via GET /files/list/data to verify parse
- Manager triggers processing via POST /trigger/waveprep with campaignId=456
- processSmsWaveFilesLambda reads CSV and queues SMS messages
- Wave sends complete in 4 hours
- Manager deletes CSV via DELETE /files after 30 days

**Scenario 3: User Exercises CCPA Right to Deletion**
- User submits deletion request via privacy portal
- Compliance system validates identity
- System triggers POST /trigger/ccpa with userId, email, phone
- processCcpaRequestLambda orchestrates deletion across 12 services
- All user data removed from databases, S3, caches
- Compliance system logs completion timestamp
- User receives confirmation within 24 hours

**Scenario 4: Admin Reviews Files Before Production Campaign**
- Admin navigates to file browser
- Enters prefix "notification-scheduler/prod-campaign-789"
- Calls GET /files/list - sees 3 files uploaded yesterday
- Calls GET /files/list/data to preview first file
- CSV parses successfully showing 1,200 recipients
- Admin verifies data quality (no invalid phone numbers)
- Admin triggers production wave with confidence

**Scenario 5: Support Cleans Up Old Test Files**
- Support admin reviews test folder with 47 files
- Identifies 20 files older than 90 days
- Copies file keys into deletion interface
- Calls DELETE /files with comma-separated keys
- 20 files removed from s3://files-bucket/test-data/
- Frees 250MB of storage
- Audit log captures deletion event
