select
    term as "term",
    crn as "crn",
    section_id as "sectionId",
    course_id as "courseId"
from
    canvaslms_sections
where
    section_id = :sectionId
