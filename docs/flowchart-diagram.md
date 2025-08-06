## Authentication Flow Diagram (Completed)

```mermaid
flowchart TD
    A[User Opens App] --> B[Check AsyncStorage]
    B --> C{User Token Exists?}
    C -- Yes --> D[Validate Token with Firebase]
    D --> E{Token Valid?}
    E -- Yes --> F[Show Dashboard]
    E -- No --> G[Clear Invalid Token]
    G --> H[Show Welcome/Login Screen]
    C -- No --> H[Show Welcome/Login Screen]
    H --> I{User Action?}
    I -- Login --> J[Show Login Form]
    I -- Register --> K[Show Register Form]
    I -- Forgot Password --> L[Show Password Reset]
    J --> M[Enter Email/Password]
    M --> N[Submit to Firebase Auth]
    N --> O{Authentication Success?}
    O -- Yes --> P[Store Token]
    P --> F
    O -- No --> Q[Show Error Message]
    Q --> J
    K --> R[Enter User Details]
    R --> S[Submit Registration]
    S --> T{Registration Success?}
    T -- Yes --> V[Auto Login]
    V --> F
    T -- No --> W[Show Registration Error]
    W --> K
    L --> X[Enter Email]
    X --> Y[Send Reset Email]
    Y --> Z[Show Confirmation Message]
    Z --> H
    F --> AA[User Can Logout]
    AA --> BB[Clear Tokens & Data]
    BB --> H
```

## Chatbot Conversation Flowchart (Completed)

```mermaid
flowchart TD
    A[User Opens Chat Screen] --> B[Display Chat Interface]
    B --> C[User Types Message]
    C --> D[Parse User Input]
    D --> E{Message Type?}
    E -- Greeting --> F[Return Welcome Message]
    E -- Balance Query --> G[Fetch User Balance from Firestore]
    E -- Add Transaction --> H[Extract Transaction Details]
    E -- Budget Query --> I[Fetch Budget Data]
    E -- Financial Tip --> J[Provide Financial Advice]
    E -- Unknown/Other --> K[Show Help Options]
    G --> L{Balance Found?}
    L -- Yes --> M[Display Current Balance]
    L -- No --> N[Show Error: No Data Found]
    H --> O{Valid Transaction Data?}
    O -- Yes --> P[Save to Firestore]
    O -- No --> Q[Ask for Missing Details]
    P --> R[Confirm Transaction Added]
    Q --> S[Wait for User Response]
    S --> H
    I --> T{Budget Exists?}
    T -- Yes --> U[Show Budget Status & Progress]
    T -- No --> V[Suggest Creating Budget]
    V --> W[Guide Budget Setup]
    J --> X[Display Financial Tips]
    X --> Y[Ask if User Needs More Help]
    K --> Z[Show Available Commands]
    Z --> AA[Examples: Balance, Add Expense, Budget]
    F --> BB[Ask How Can I Help?]
    M --> BB
    N --> BB
    R --> BB
    U --> BB
    X --> BB
    AA --> BB
    BB --> CC[Wait for Next User Input]
    CC --> C
    Y --> DD{User Response?}
    DD -- Yes --> J
    DD -- No --> BB
```

## Transaction Automation Flowchart (Completed)

```mermaid
flowchart TD
    A[User Wants to Add Transaction] --> B{Entry Method?}
    B -->|Manual Form| C[Open Transaction Form]
    B -->|Chat Input| D[User: Add expense 50k groceries]
    B -->|Notification Listener| E[Detect Bank Notification]
    C --> F[Fill Transaction Details]
    F --> G[Select Category]
    G --> H[Choose Date]
    H --> I[Enter Amount]
    I --> J[Add Notes (Optional)]
    D --> K[Parse Chat Message]
    K --> L{Data Extraction Successful?}
    L -->|Yes| M[Auto-fill Form Fields]
    L -->|No| N[Ask for Clarification]
    N --> O[User Provides More Details]
    O --> K
    E --> P[Parse Notification Text]
    P --> Q{Recognizable Format?}
    Q -->|Yes| R[Extract Transaction Info]
    Q -->|No| S[Skip or Ask User for Help]
    M --> T[Review Auto-filled Data]
    J --> T
    R --> T
    T --> U{Is Data Valid?}
    U -->|No| V[Show Validation Errors]
    V --> W[User Fixes Data]
    W --> T
    U -->|Yes| X[Categorize Transaction]
    X --> Y{Category Found?}
    Y -- Yes --> Z[Apply Category]
    Y -- No --> ZA[Ask User to Choose Category]
    ZA --> Z
    Z --> ZB[Save to Firestore]
    ZB --> ZC{Save Successful?}
    ZC -- Yes --> ZD[Update Balance]
    ZC -- No --> ZE[Show Save Error]
    ZE --> ZF[Retry Save]
    ZF --> ZB
    ZD --> ZG[Update Budget Tracking]
    ZG --> ZH{Budget Limit Exceeded?}
    ZH -- Yes --> ZI[Send Budget Alert]
    ZH -- No --> ZJ[Update Statistics]
    ZI --> ZJ
    ZJ --> ZK[Show Success Message]
    ZK --> ZL[Return to Dashboard]
    ZL --> ZM[Sync Across Devices]
```

## Budget Management Flowchart (Completed)

```mermaid
flowchart TD
    A[User Accesses Budget Section] --> B{Budget Exists?}
    B -- No --> C[Show Create Budget Option]
    C --> D[User Clicks Create Budget]
    D --> E[Budget Setup Form]
    E --> F[Enter Monthly Income]
    F --> G[Set Category Limits]
    G --> H[Choose Budget Period]
    H --> I[Save Budget to Firestore]
    B -- Yes --> J[Display Current Budget]
    J --> K[Show Budget Overview]
    K --> L{User Action?}
    L -- View Details --> M[Show Category Breakdown]
    L -- Edit Budget --> N[Open Edit Form]
    L -- Add Goal --> O[Create Savings Goal]
    L -- View Analytics --> P[Show Spending Analytics]
    I --> Q{Save Success?}
    Q -- Yes --> R[Budget Created Successfully]
    Q -- No --> S[Show Error Message]
    S --> T[Retry Save]
    T --> I
    R --> U[Calculate Remaining Amounts]
    U --> V[Update Dashboard]
    M --> W[Display Spent vs Budgeted]
    W --> X{Over Budget?}
    X -- Yes --> Y[Show Warning Alert]
    X -- No --> Z[Show Progress Bar]
    N --> AA[Pre-fill Current Values]
    AA --> BB[User Modifies Budget]
    BB --> CC[Update Firestore]
    CC --> DD{Update Success?}
    DD -- Yes --> EE[Refresh Budget Display]
    DD -- No --> FF[Show Update Error]
    FF --> BB
    O --> GG[Set Goal Amount]
    GG --> HH[Choose Target Date]
    HH --> II[Calculate Monthly Target]
    II --> JJ[Save Goal to Database]
    P --> KK[Generate Charts]
    KK --> LL[Show Spending Trends]
    LL --> MM[Compare Months]
    MM --> NN[Provide Insights]
    Y --> OO[Suggest Budget Adjustments]
    Z --> PP[Show Achievement Progress]
    EE --> U
    JJ --> QQ[Add to Goals List]
    NN --> RR[Return to Budget Overview]
    OO --> RR
    PP --> RR
    QQ --> RR
    RR --> SS[Check for Notifications]
    SS --> TT{Send Alerts?}
    TT -- Yes --> UU[Budget Alert Notifications]
    TT -- No --> VV[Continue Normal Flow]
    UU --> WW[Push Notification Service]
    WW --> VV
    VV --> XX[Auto-sync Data]
```

## Notification Service Flowchart (Completed)

```mermaid
flowchart TD
    A[Trigger Event] --> B{Event Type?}
    B -- Budget Exceeded --> C[Calculate Over-Budget Amount]
    B -- Goal Achieved --> D[Check Savings Goal Status]
    B -- Transaction Added --> E[Validate Transaction Impact]
    B -- Daily Reminder --> F[Check User Preferences]
    B -- Weekly Summary --> G[Generate Weekly Report]
    C --> H[Create Budget Alert]
    D --> I[Create Achievement Notification]
    E --> J[Create Transaction Confirmation]
    F --> K[Create Daily Tip/Reminder]
    G --> L[Create Summary Notification]
    H --> M{User Notification Settings?}
    I --> M
    J --> M
    K --> M
    L --> M
    M -- Push Enabled --> N[Prepare Push Notification]
    M -- In-App Only --> O[Store In-App Notification]
    M -- Disabled --> P[Skip Notification]
    N --> Q[Firebase Cloud Messaging]
    Q --> R{FCM Token Valid?}
    R -- Yes --> S[Send Push Notification]
    R -- No --> T[Update FCM Token]
    T --> U[Retry Send]
    U --> S
    S --> V{Delivery Success?}
    V -- Yes --> W[Log Success]
    V -- No --> X[Log Error & Retry]
    X --> Y{Retry Count < 3?}
    Y -- Yes --> Z[Schedule Retry]
    Y -- No --> AA[Mark as Failed]
    O --> BB[Save to Local Storage]
    BB --> CC[Update Notification Badge]
    CC --> DD[Display in Notification Center]
    W --> EE[Update Notification Status]
    AA --> EE
    DD --> EE
    P --> EE
    EE --> FF[Analytics Tracking]
    FF --> GG{User Clicked?}
    GG -- Yes --> HH[Open Relevant Screen]
    GG -- No --> II[Mark as Read After 24h]
    HH --> JJ[Track Engagement]
    II --> KK[Clean Old Notifications]
    JJ --> LL[End Flow]
    KK --> LL
    Z --> MM[Wait for Retry Time]
    MM --> N
```

## Authentication Use Case Diagram

```mermaid
graph TB
    User((User))
    AuthSystem[Authentication System]
    Firebase[Firebase Auth]
    Storage[AsyncStorage]
    
    User -->|Opens App| AuthSystem
    User -->|Login| AuthSystem
    User -->|Register| AuthSystem
    User -->|Forgot Password| AuthSystem
    User -->|Logout| AuthSystem
    
    AuthSystem -->|Validate Token| Firebase
    AuthSystem -->|Store/Clear Token| Storage
    AuthSystem -->|Show Welcome Screen| User
    AuthSystem -->|Show Dashboard| User
    AuthSystem -->|Show Error Messages| User
```

## Chat System Use Case Diagram

```mermaid
graph TB
    User((User))
    ChatBot[Chat Bot]
    Firestore[Firestore Database]
    TransactionService[Transaction Service]
    
    User -->|Send Message| ChatBot
    User -->|View Chat History| ChatBot
    
    ChatBot -->|Parse Input| ChatBot
    ChatBot -->|Query Balance| Firestore
    ChatBot -->|Query Budget| Firestore
    ChatBot -->|Add Transaction| TransactionService
    ChatBot -->|Provide Financial Tips| User
    ChatBot -->|Show Help Commands| User
    ChatBot -->|Display Response| User
    
    TransactionService -->|Save Transaction| Firestore
    TransactionService -->|Confirm Success| ChatBot
```

## Transaction Management Use Case Diagram

```mermaid
graph TB
    User((User))
    SMS[SMS Service]
    Email[Email Service]
    TransactionSystem[Transaction System]
    Firestore[Firestore Database]
    NotificationService[Notification Service]
    
    User -->|Add Manual Transaction| TransactionSystem
    User -->|View Transactions| TransactionSystem
    User -->|Filter by Period| TransactionSystem
    User -->|Expand Transaction Details| TransactionSystem
    
    SMS -->|Detect Bank SMS| TransactionSystem
    Email -->|Detect Bank Email| TransactionSystem
    
    TransactionSystem -->|Parse Transaction Data| TransactionSystem
    TransactionSystem -->|Auto-categorize| TransactionSystem
    TransactionSystem -->|Save to Database| Firestore
    TransactionSystem -->|Update Balance| Firestore
    TransactionSystem -->|Send Confirmation| User
    TransactionSystem -->|Trigger Budget Check| NotificationService
```

## Budget Management Use Case Diagram

```mermaid
graph TB
    User((User))
    BudgetSystem[Budget System]
    Firestore[Firestore Database]
    NotificationService[Notification Service]
    Analytics[Analytics Service]
    
    User -->|Create Budget| BudgetSystem
    User -->|Edit Budget| BudgetSystem
    User -->|View Budget Status| BudgetSystem
    User -->|Set Goals| BudgetSystem
    
    BudgetSystem -->|Save Budget| Firestore
    BudgetSystem -->|Calculate Progress| BudgetSystem
    BudgetSystem -->|Check Limits| BudgetSystem
    BudgetSystem -->|Display Overview| User
    BudgetSystem -->|Show Progress Bar| User
    BudgetSystem -->|Generate Charts| Analytics
    BudgetSystem -->|Send Alert| NotificationService
    
    NotificationService -->|Budget Exceeded Alert| User
    Analytics -->|Show Trends| User
```

## Notification System Use Case Diagram

```mermaid
graph TB
    User((User))
    NotificationService[Notification Service]
    FCM[Firebase Cloud Messaging]
    LocalStorage[Local Storage]
    
    User -->|View Notifications| NotificationService
    User -->|Enable/Disable Notifications| NotificationService
    User -->|Click Notification| NotificationService
    
    NotificationService -->|Send Push Notification| FCM
    NotificationService -->|Store In-App Notification| LocalStorage
    NotificationService -->|Update Badge Count| User
    NotificationService -->|Open Relevant Screen| User
    NotificationService -->|Track Engagement| NotificationService
    
    FCM -->|Deliver Push| User
```

## Complete FinWise App Flow Diagram

```mermaid
flowchart TD
    A[User Opens FinWise App] --> B[Check Authentication]
    B --> C{User Logged In?}
    C -- No --> D[Show Welcome Screen]
    D --> E[Login/Register Process]
    E --> F[Firebase Authentication]
    F --> G{Auth Success?}
    G -- Yes --> H[Store User Session]
    G -- No --> I[Show Auth Error]
    I --> D
    C -- Yes --> J[Load Home Dashboard]
    H --> J
    
    %% Home Dashboard Flow
    J --> K[Fetch User Data from Firestore]
    K --> L[Display Balance & Overview]
    L --> M[Show Recent Transactions]
    M --> N[Display Budget Status]
    N --> O[Enable Background Services]
    
    %% Background Services
    O --> P[SMS Monitoring Service]
    O --> Q[Email Monitoring Service]
    O --> R[FCM Token Registration]
    
    %% User Interactions
    L --> S{User Action?}
    S -- Add Transaction --> T[Manual Transaction Form]
    S -- Open Chat --> U[AI Chat Interface]
    S -- View Stats --> V[Analytics Screen]
    S -- Manage Budget --> W[Budget Management]
    S -- Search --> X[Search & Filter]
    S -- Profile --> Y[User Profile]
    
    %% Transaction Processing
    T --> Z[Fill Transaction Details]
    Z --> AA[Save to Firestore]
    P --> BB[Detect Bank SMS]
    Q --> CC[Detect Bank Email]
    BB --> DD[Parse Transaction Data]
    CC --> DD
    DD --> EE[Auto-create Transaction]
    EE --> AA
    AA --> FF[Update Balance]
    FF --> GG[Check Budget Impact]
    GG --> HH{Budget Exceeded?}
    HH -- Yes --> II[Send Budget Alert]
    HH -- No --> JJ[Update UI]
    II --> KK[FCM Push Notification]
    KK --> JJ
    
    %% Chat Processing
    U --> LL[User Sends Message]
    LL --> MM[AI Processes Query]
    MM --> NN{Query Type?}
    NN -- Balance --> OO[Fetch Balance Data]
    NN -- Add Transaction --> PP[Extract Transaction Info]
    NN -- Budget --> QQ[Fetch Budget Data]
    NN -- Tips --> RR[Provide Financial Advice]
    OO --> SS[Return Response]
    PP --> T
    QQ --> SS
    RR --> SS
    SS --> TT[Display in Chat]
    TT --> UU[Listen for Automatic Updates]
    UU --> VV[DeviceEventEmitter]
    VV --> WW[Show Auto-detected Transactions]
    
    %% Budget Management
    W --> XX[Show Budget Overview]
    XX --> YY{Budget Exists?}
    YY -- No --> ZZ[Create New Budget]
    YY -- Yes --> AAA[Display Current Budget]
    ZZ --> BBB[Set Category Limits]
    BBB --> CCC[Save Budget to Firestore]
    AAA --> DDD[Show Progress Bars]
    DDD --> EEE[Real-time Spending Updates]
    
    %% Analytics & Search
    V --> FFF[Generate Charts & Reports]
    X --> GGG[Filter Transaction History]
    
    %% Real-time Updates
    JJ --> HHH[Real-time Sync]
    CCC --> HHH
    FFF --> HHH
    GGG --> HHH
    WW --> HHH
    HHH --> III[Update All Screens]
    III --> J
    
    %% Logout Flow
    Y --> JJJ[User Settings]
    JJJ --> KKK{User Action?}
    KKK -- Logout --> LLL[Clear User Session]
    LLL --> MMM[Stop Background Services]
    MMM --> D
    KKK -- Other --> NNN[Update Settings]
    NNN --> Y
    
    %% Error Handling
    AA --> OOO{Save Success?}
    OOO -- No --> PPP[Show Error & Retry]
    PPP --> T
    OOO -- Yes --> FF
```

## Complete FinWise App Use Case Diagram

```mermaid
graph TB
    User((User))
    
    %% Main App Systems
    AuthSystem[Authentication System]
    HomeScreen[Home Dashboard]
    ChatBot[AI Chat Assistant]
    TransactionSystem[Transaction System]
    BudgetSystem[Budget Management]
    NotificationSystem[Notification System]
    SearchSystem[Search & Filter]
    
    %% External Services
    Firebase[Firebase Auth]
    Firestore[Firestore Database]
    FCM[Firebase Cloud Messaging]
    SMS[SMS Monitoring]
    Email[Email Monitoring]
    
    %% Authentication Flow
    User -->|Login/Register/Logout| AuthSystem
    AuthSystem -->|Validate| Firebase
    AuthSystem -->|Authorized Access| HomeScreen
    
    %% Home Dashboard
    User -->|View Dashboard| HomeScreen
    HomeScreen -->|Display Balance| User
    HomeScreen -->|Show Transactions| User
    HomeScreen -->|Show Budget Status| User
    HomeScreen -->|Navigate to Sections| User
    
    %% Chat System
    User -->|Chat with AI| ChatBot
    ChatBot -->|Process Queries| Firestore
    ChatBot -->|Add Transactions| TransactionSystem
    ChatBot -->|Provide Financial Tips| User
    
    %% Transaction Management
    User -->|Add Manual Transaction| TransactionSystem
    User -->|View Transaction History| TransactionSystem
    SMS -->|Auto-detect Bank SMS| TransactionSystem
    Email -->|Auto-detect Bank Email| TransactionSystem
    TransactionSystem -->|Save/Update| Firestore
    TransactionSystem -->|Real-time Sync| HomeScreen
    
    %% Budget Management
    User -->|Manage Budget| BudgetSystem
    BudgetSystem -->|Track Spending| Firestore
    BudgetSystem -->|Monitor Limits| NotificationSystem
    BudgetSystem -->|Display Progress| HomeScreen
    
    %% Search & Analytics
    User -->|Search Transactions| SearchSystem
    SearchSystem -->|Filter Results| Firestore
    SearchSystem -->|Show Analytics| User
    
    %% Notification System
    NotificationSystem -->|Push Notifications| FCM
    NotificationSystem -->|In-App Alerts| User
    NotificationSystem -->|Budget Warnings| User
    FCM -->|Deliver to Device| User
    
    %% Data Flow
    Firestore -->|Real-time Updates| HomeScreen
    Firestore -->|Transaction Data| ChatBot
    Firestore -->|Budget Data| BudgetSystem
    Firestore -->|Search Data| SearchSystem
    
    %% Style
    classDef userNode fill:#e1f5fe
    classDef systemNode fill:#f3e5f5
    classDef serviceNode fill:#e8f5e8
    
    class User userNode
    class AuthSystem,HomeScreen,ChatBot,TransactionSystem,BudgetSystem,NotificationSystem,SearchSystem systemNode
    class Firebase,Firestore,FCM,SMS,Email serviceNode
```

## Complete FinWise App Database Schema

```mermaid
erDiagram
    USERS {
        string uid PK "Firebase Auth UID"
        string email
        string displayName
        string photoURL
        timestamp createdAt
        timestamp lastLoginAt
        object preferences
        string fcmToken
        boolean emailNotifications
        boolean pushNotifications
    }

    TRANSACTIONS {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string type "income/expense"
        number amount
        string currency "VND/USD/EUR etc"
        number amountInVND "Converted amount"
        string category
        string title
        string description
        string source "manual/sms/email/chat"
        timestamp date
        timestamp createdAt
        timestamp updatedAt
        object metadata "SMS/Email parsing data"
        boolean isRecurring
        string recurringPattern
    }

    BUDGETS {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string name
        string period "monthly/weekly/yearly"
        number totalAmount
        timestamp startDate
        timestamp endDate
        object categoryLimits "Object with category:amount pairs"
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    BUDGET_TRACKING {
        string id PK "Auto-generated ID"
        string budgetId FK "Reference to BUDGETS.id"
        string userId FK "Reference to USERS.uid"
        string category
        number budgetedAmount
        number spentAmount
        number remainingAmount
        timestamp lastUpdated
        object transactions "Array of transaction IDs"
    }

    CATEGORIES {
        string id PK "Auto-generated ID"
        string name
        string type "income/expense"
        string icon
        string color
        boolean isDefault
        string userId FK "NULL for default categories"
        timestamp createdAt
    }

    GOALS {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string name
        string description
        number targetAmount
        number currentAmount
        timestamp targetDate
        string category
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    NOTIFICATIONS {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string type "budget_exceeded/goal_achieved/transaction_added/reminder"
        string title
        string message
        object data "Additional notification data"
        boolean isRead
        boolean isPush
        timestamp createdAt
        timestamp readAt
    }

    CHAT_HISTORY {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string type "user/assistant"
        string message
        object metadata "Parsed data, action taken"
        string sessionId
        timestamp timestamp
        boolean isProcessed
    }

    CURRENCY_RATES {
        string id PK "Currency pair like USD_VND"
        string baseCurrency
        string targetCurrency
        number rate
        timestamp lastUpdated
        string source "API source"
    }

    USER_SETTINGS {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string defaultCurrency
        string dateFormat
        string theme "light/dark/system"
        string language
        object notificationSettings
        object privacySettings
        timestamp updatedAt
    }

    PROCESSED_MESSAGES {
        string id PK "Auto-generated ID"
        string userId FK "Reference to USERS.uid"
        string messageId "Unique SMS/Email ID"
        string type "sms/email"
        string content
        boolean isProcessed
        timestamp processedAt
        object extractedData
    }

    %% Relationships
    USERS ||--o{ TRANSACTIONS : "creates"
    USERS ||--o{ BUDGETS : "owns"
    USERS ||--o{ GOALS : "sets"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ CHAT_HISTORY : "participates"
    USERS ||--o{ USER_SETTINGS : "configures"
    USERS ||--o{ PROCESSED_MESSAGES : "generates"
    USERS ||--o{ CATEGORIES : "customizes"

    BUDGETS ||--o{ BUDGET_TRACKING : "tracks"
    TRANSACTIONS }o--|| CATEGORIES : "belongs_to"
    TRANSACTIONS }o--|| BUDGETS : "affects"
    
    BUDGET_TRACKING }o--|| CATEGORIES : "monitors"
    GOALS }o--|| CATEGORIES : "targets"
```

## Database Collections Overview

### Core Collections:

1. **USERS** - Firebase Auth integration with user preferences
2. **TRANSACTIONS** - All financial transactions with multi-currency support
3. **BUDGETS** - Budget definitions with category-wise limits
4. **BUDGET_TRACKING** - Real-time budget monitoring and spending tracking

### Support Collections:

5. **CATEGORIES** - Default and custom transaction categories
6. **GOALS** - Savings and financial goals
7. **NOTIFICATIONS** - Push and in-app notification history
8. **CHAT_HISTORY** - AI assistant conversation logs

### System Collections:

9. **CURRENCY_RATES** - Real-time currency conversion rates
10. **USER_SETTINGS** - App preferences and configuration
11. **PROCESSED_MESSAGES** - SMS/Email processing tracking to prevent duplicates

### Key Features:

- **Multi-currency Support**: All transactions store both original and VND amounts
- **Real-time Sync**: Firestore real-time listeners for live updates
- **Duplicate Prevention**: Processed messages tracking for SMS/Email
- **Flexible Categories**: Default system categories + user custom categories
- **Budget Monitoring**: Real-time budget tracking with category-wise breakdowns
- **Notification System**: Comprehensive notification storage and tracking
- **Chat Integration**: Complete conversation history with metadata
- **Goal Tracking**: Financial goals with progress monitoring

## Complete FinWise App Class Diagram (Core Entities)

```mermaid
classDiagram
    %% Core Entity Classes
    class User {
        +uid: string
        +email: string
        +displayName: string
        +photoURL: string
        +createdAt: Date
        +lastLoginAt: Date
        +preferences: UserPreferences
        +fcmToken: string
        +emailNotifications: boolean
        +pushNotifications: boolean
        +validate() boolean
        +updateProfile(data: ProfileData) void
        +getPreferences() UserPreferences
    }

    class Transaction {
        +id: string
        +userId: string
        +type: TransactionType
        +amount: number
        +currency: string
        +amountInVND: number
        +category: string
        +title: string
        +description: string
        +source: TransactionSource
        +date: Date
        +createdAt: Date
        +updatedAt: Date
        +metadata: object
        +isRecurring: boolean
        +validate() boolean
        +convertCurrency(targetCurrency: string) number
        +categorize() Category
    }

    class Budget {
        +id: string
        +userId: string
        +name: string
        +period: BudgetPeriod
        +totalAmount: number
        +startDate: Date
        +endDate: Date
        +categoryLimits: Map~string, number~
        +isActive: boolean
        +createdAt: Date
        +updatedAt: Date
        +calculateSpent() number
        +getRemainingAmount() number
        +isOverBudget() boolean
        +getProgress() number
    }

    class Category {
        +id: string
        +name: string
        +type: TransactionType
        +icon: string
        +color: string
        +isDefault: boolean
        +userId: string
        +createdAt: Date
        +validate() boolean
        +isCustomCategory() boolean
    }

    class Goal {
        +id: string
        +userId: string
        +name: string
        +description: string
        +targetAmount: number
        +currentAmount: number
        +targetDate: Date
        +category: string
        +isActive: boolean
        +createdAt: Date
        +updatedAt: Date
        +getProgress() number
        +isCompleted() boolean
        +getDaysRemaining() number
        +getMonthlyTarget() number
    }

    class Notification {
        +id: string
        +userId: string
        +type: NotificationType
        +title: string
        +message: string
        +data: object
        +isRead: boolean
        +isPush: boolean
        +createdAt: Date
        +readAt: Date
        +markAsRead() void
        +isExpired() boolean
    }

    class ChatMessage {
        +id: string
        +userId: string
        +type: MessageType
        +content: string
        +timestamp: Date
        +metadata: object
        +sessionId: string
        +isProcessed: boolean
        +extractTransactionData() TransactionData
        +getIntent() MessageIntent
    }

    class BudgetTracking {
        +id: string
        +budgetId: string
        +userId: string
        +category: string
        +budgetedAmount: number
        +spentAmount: number
        +remainingAmount: number
        +lastUpdated: Date
        +transactions: string[]
        +updateSpending(amount: number) void
        +getSpendingPercentage() number
        +isOverLimit() boolean
    }

    class CurrencyRate {
        +id: string
        +baseCurrency: string
        +targetCurrency: string
        +rate: number
        +lastUpdated: Date
        +source: string
        +isExpired() boolean
        +convert(amount: number) number
    }

    class UserSettings {
        +id: string
        +userId: string
        +defaultCurrency: string
        +dateFormat: string
        +theme: string
        +language: string
        +notificationSettings: object
        +privacySettings: object
        +updatedAt: Date
        +updateSetting(key: string, value: any) void
        +getNotificationPreference(type: string) boolean
    }

    class ProcessedMessage {
        +id: string
        +userId: string
        +messageId: string
        +type: MessageType
        +content: string
        +isProcessed: boolean
        +processedAt: Date
        +extractedData: object
        +isDuplicate() boolean
        +extractTransactionInfo() TransactionData
    }

    %% Enums and Types
    class TransactionType {
        <<enumeration>>
        INCOME
        EXPENSE
    }

    class TransactionSource {
        <<enumeration>>
        MANUAL
        SMS
        EMAIL
        CHAT
    }

    class BudgetPeriod {
        <<enumeration>>
        WEEKLY
        MONTHLY
        YEARLY
    }

    class NotificationType {
        <<enumeration>>
        BUDGET_EXCEEDED
        GOAL_ACHIEVED
        TRANSACTION_ADDED
        REMINDER
    }

    class MessageType {
        <<enumeration>>
        USER
        ASSISTANT
        SMS
        EMAIL
    }

    %% Relationships
    User ||--o{ Transaction : "creates"
    User ||--o{ Budget : "owns"
    User ||--o{ Goal : "sets"
    User ||--o{ Notification : "receives"
    User ||--o{ ChatMessage : "participates"
    User ||--o{ UserSettings : "configures"
    User ||--o{ ProcessedMessage : "generates"
    User ||--o{ Category : "customizes"

    Budget ||--o{ BudgetTracking : "tracks"
    Budget ||--o{ Transaction : "monitors"
    
    Transaction }o--|| Category : "belongs_to"
    Transaction ||--o{ BudgetTracking : "affects"
    
    Goal }o--|| Category : "targets"
    
    BudgetTracking }o--|| Category : "monitors"
    
    %% Type Dependencies
    Transaction --> TransactionType
    Transaction --> TransactionSource
    Budget --> BudgetPeriod
    Notification --> NotificationType
    ChatMessage --> MessageType
    ProcessedMessage --> MessageType
```

## Core Entity Overview

### **Primary Entities:**
1. **User** - Account and profile management
2. **Transaction** - Financial transactions with multi-currency support
3. **Budget** - Budget configuration and tracking
4. **Category** - Transaction categorization (default + custom)
5. **Goal** - Savings and financial goals

### **Supporting Entities:**
6. **Notification** - Push and in-app notifications
7. **ChatMessage** - AI conversation history
8. **BudgetTracking** - Real-time budget monitoring
9. **CurrencyRate** - Exchange rate management
10. **UserSettings** - App preferences
11. **ProcessedMessage** - SMS/Email duplicate prevention

### **Key Relationships:**
- **User** → **Transaction** (1:Many) - Users create multiple transactions
- **User** → **Budget** (1:Many) - Users can have multiple budgets
- **Budget** → **BudgetTracking** (1:Many) - Track spending per category
- **Transaction** → **Category** (Many:1) - Transactions belong to categories
- **Goal** → **Category** (Many:1) - Goals target specific categories

### **Entity Features:**
- **Validation**: All entities have validation methods
- **Timestamps**: Created/updated timestamps for auditing
- **Business Logic**: Calculation methods (progress, remaining amounts, etc.)
- **Type Safety**: Enums for consistent data types
- **Multi-currency**: Currency conversion support
- **Real-time**: Support for live data updates


