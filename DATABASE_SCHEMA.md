# Resumax Database Schema

Complete database schema for the Resumax application using Supabase (PostgreSQL).

## Overview

The database uses Supabase's built-in `auth.users` table for authentication. All other tables reference `auth.users(id)` via foreign keys.

---

## Core Tables

### 1. `profiles` (User Profiles)
Extends Supabase auth.users with additional profile information.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `personal_info`
Stores personal information for each user.

```sql
CREATE TABLE personal_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    linkedin TEXT,
    github TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

### 3. `experiences`
Work experience entries.

```sql
CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    role TEXT NOT NULL,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    is_current BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `education`
Education entries.

```sql
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `projects`
Project entries.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    technologies TEXT,
    url TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. `custom_sections`
Custom sections (certifications, awards, etc.).

```sql
CREATE TABLE custom_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. `resume_points`
Unlimited bullet points for experiences, education, projects, and custom sections.

```sql
CREATE TABLE resume_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
    education_id UUID REFERENCES education(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    custom_section_id UUID REFERENCES custom_sections(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    is_non_negotiable BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure only one parent is set
    CHECK (
        (experience_id IS NOT NULL)::int +
        (education_id IS NOT NULL)::int +
        (project_id IS NOT NULL)::int +
        (custom_section_id IS NOT NULL)::int = 1
    )
);
```

---

## Saved Resumes & Sharing

### 8. `saved_resumes`
Saved tailored resumes for specific job applications.

```sql
CREATE TABLE saved_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    resume_data JSONB NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
```

### 9. `shared_resume_links`
Shareable links for resumes with optional comments.

```sql
CREATE TABLE shared_resume_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES saved_resumes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP
);

CREATE INDEX idx_shared_links_token ON shared_resume_links(share_token);
```

### 10. `resume_comments`
Comments on shared resumes (supports nested replies).

```sql
CREATE TABLE resume_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_link_id UUID REFERENCES shared_resume_links(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES resume_comments(id) ON DELETE CASCADE,
    bullet_id VARCHAR(255),
    bullet_text TEXT,
    section_type VARCHAR(50),
    entry_id VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_link ON resume_comments(shared_link_id);
```

---

## Optimization & Job Matching

### 11. `optimizations`
Track optimization history for job descriptions.

```sql
CREATE TABLE optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_description TEXT,
    selected_point_ids UUID[],
    mode VARCHAR(50),  -- 'select', 'optimize', 'strict', 'creative'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 12. `job_descriptions`
Saved job descriptions for reference.

```sql
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url VARCHAR(500),
    text_content TEXT,
    extracted_keywords JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_experiences_user ON experiences(user_id);
CREATE INDEX idx_education_user ON education(user_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_custom_sections_user ON custom_sections(user_id);
CREATE INDEX idx_resume_points_experience ON resume_points(experience_id);
CREATE INDEX idx_resume_points_education ON resume_points(education_id);
CREATE INDEX idx_resume_points_project ON resume_points(project_id);
CREATE INDEX idx_resume_points_custom ON resume_points(custom_section_id);
CREATE INDEX idx_saved_resumes_user ON saved_resumes(user_id);
CREATE INDEX idx_shared_links_user ON shared_resume_links(user_id);
CREATE INDEX idx_shared_links_resume ON shared_resume_links(resume_id);
CREATE INDEX idx_comments_user ON resume_comments(user_id);
CREATE INDEX idx_comments_parent ON resume_comments(parent_id);
CREATE INDEX idx_optimizations_user ON optimizations(user_id);
CREATE INDEX idx_job_descriptions_user ON job_descriptions(user_id);
```

---

## Relationships

```
auth.users (Supabase)
    ├── profiles (1:1)
    ├── personal_info (1:1)
    ├── experiences (1:many)
    │   └── resume_points (1:many)
    ├── education (1:many)
    │   └── resume_points (1:many)
    ├── projects (1:many)
    │   └── resume_points (1:many)
    ├── custom_sections (1:many)
    │   └── resume_points (1:many)
    ├── saved_resumes (1:many)
    │   └── shared_resume_links (1:many)
    │       └── resume_comments (1:many)
    │           └── resume_comments (self-reference for replies)
    ├── optimizations (1:many)
    └── job_descriptions (1:many)
```

---

## Notes

- All tables use `UUID` primary keys for better distribution and security
- Timestamps use `TIMESTAMP DEFAULT NOW()` for automatic tracking
- Foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- `resume_points` uses a CHECK constraint to ensure exactly one parent relationship
- `shared_resume_links` includes token-based sharing with expiration support
- `resume_comments` supports nested replies via `parent_id` self-reference
- All user-related tables reference `auth.users(id)` for authentication

