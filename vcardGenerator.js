const fs = require("fs");
const path = require("path");


function escapeVCardValue(value) {
  return value
    .replace(/\\/g, '\\\\')  // Backslash
    .replace(/;/g, '\\;')    // Semicolon
    .replace(/,/g, '\\,')    // Comma
    .replace(/\n/g, '\\n');  // Newline
}


function foldLine(line) {
  if (line.length <= 75) {
    return line;
  }
  
  const folded = [];
  let current = line;
  
  // First line can be 75 chars
  folded.push(current.substring(0, 75));
  current = current.substring(75);
  
  // Continuation lines must start with a space and can be 74 chars (75 - 1 for space)
  while (current.length > 0) {
    folded.push(' ' + current.substring(0, 74));
    current = current.substring(74);
  }
  
  return folded.join('\r\n');
}


function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


function validatePhone(phone) {
  // Accept various formats: +33123456789, 0123456789, +33 1 23 45 67 89, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}


function validateVCardData(data) {
  const errors = [];
  
  if (!data.lastName || data.lastName.trim() === '') {
    errors.push("Le nom de famille de l'enseignant est obligatoire. Veuillez le spécifier.");
  }
  
  if (!data.firstName || data.firstName.trim() === '') {
    errors.push("Le prénom de l'enseignant est obligatoire. Veuillez le spécifier.");
  }
  
  if (data.email) {
    if (!validateEmail(data.email)) {
      errors.push(
        "L'email fourni n'est pas valide. " +
        "Veuillez utiliser un format standard (ex. : nom@domaine.se)."
      );
    }
  }
  
  // Phone validation (if provided)
  if (data.phone && !validatePhone(data.phone)) {
    errors.push(
      "Le numéro de téléphone fourni n'est pas valide. " +
      "Veuillez utiliser un format standard (ex. : +46 123 456 789)."
    );
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function generateVCardContent(teacherData) {
  const lines = [];
  
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:4.0');
  
  // FN (Formatted Name) - REQUIRED
  const formattedName = `${teacherData.firstName} ${teacherData.lastName}`;
  lines.push(`FN:${escapeVCardValue(formattedName)}`);
  
  // N (Structured Name) - Family;Given;Additional;Prefix;Suffix
  const lastName = escapeVCardValue(teacherData.lastName);
  const firstName = escapeVCardValue(teacherData.firstName);
  const middleName = teacherData.middleName ? escapeVCardValue(teacherData.middleName) : '';
  const prefix = teacherData.prefix ? escapeVCardValue(teacherData.prefix) : '';
  const suffix = teacherData.suffix ? escapeVCardValue(teacherData.suffix) : '';
  
  lines.push(`N:${lastName};${firstName};${middleName};${prefix};${suffix}`);
  
  // EMAIL
  if (teacherData.email) {
    lines.push(`EMAIL;TYPE=work:${teacherData.email}`);
  }
  
  // TEL (Telephone)
  if (teacherData.phone) {
    lines.push(`TEL;TYPE=work,voice:${teacherData.phone}`);
  }
  
  if (teacherData.mobile) {
    lines.push(`TEL;TYPE=cell:${teacherData.mobile}`);
  }
  
  // ORG (Organization)
  if (teacherData.organization) {
    const org = escapeVCardValue(teacherData.organization);
    const department = teacherData.department ? escapeVCardValue(teacherData.department) : '';
    lines.push(`ORG:${org}${department ? ';' + department : ''}`);
  }
  
  // TITLE (Job Title)
  if (teacherData.title) {
    lines.push(`TITLE:${escapeVCardValue(teacherData.title)}`);
  }
  
  // ROLE
  if (teacherData.role) {
    lines.push(`ROLE:${escapeVCardValue(teacherData.role)}`);
  }
  
  // ADR (Address) - ;;street;city;region;postal;country
  if (teacherData.address) {
    const addr = teacherData.address;
    const street = addr.street ? escapeVCardValue(addr.street) : '';
    const city = addr.city ? escapeVCardValue(addr.city) : '';
    const region = addr.region ? escapeVCardValue(addr.region) : '';
    const postalCode = addr.postalCode ? escapeVCardValue(addr.postalCode) : '';
    const country = addr.country ? escapeVCardValue(addr.country) : '';
    
    lines.push(`ADR;TYPE=work:;;${street};${city};${region};${postalCode};${country}`);
  }
  
  // URL (Website)
  if (teacherData.url) {
    lines.push(`URL:${teacherData.url}`);
  }
  
  // NOTE
  if (teacherData.note) {
    lines.push(`NOTE:${escapeVCardValue(teacherData.note)}`);
  }
  
  // REV (Revision) - ISO 8601 timestamp
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  lines.push(`REV:${now}`);
  
  // PRODID (Product Identifier)
  lines.push('PRODID:-//SRYEM//GIFT CLI VCard Generator//FR');
  
  // End vCard
  lines.push('END:VCARD');
  
  // Fold lines as per RFC 6350 (max 75 chars per line)
  const foldedLines = lines.map(line => foldLine(line));
  
  // Join with CRLF as specified in RFC 6350
  return foldedLines.join('\r\n') + '\r\n';
}


function saveVCardFile(content, filePath) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file with UTF-8 encoding
    fs.writeFileSync(filePath, content, "utf8");
    
    return {
      success: true,
      path: filePath,
      size: content.length,
    };
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error(
        "Impossible d'écrire le fichier. Vérifiez les permissions du dossier."
      );
    } else if (error.code === 'ENOENT') {
      throw new Error(
        "Le chemin spécifié n'existe pas. Vérifiez le chemin du fichier."
      );
    } else {
      throw new Error(
        `Erreur lors de l'écriture du fichier: ${error.message}`
      );
    }
  }
}

function generateVCardFile(teacherData, outputPath) {
  const validation = validateVCardData(teacherData);
  
  if (!validation.valid) {
    const errorMsg = "Les données de l'enseignant sont invalides:\n" +
      validation.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
    throw new Error(errorMsg);
  }
  
    const content = generateVCardContent(teacherData);
  
  const result = saveVCardFile(content, outputPath);
  
  return {
    ...result,
    teacher: `${teacherData.firstName} ${teacherData.lastName}`,
  };
}

function getDefaultVCardFilename(firstName, lastName) {
  const sanitized = `${firstName}_${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  return `vcard_${sanitized}.vcf`;
}


function extractTeacherFromExam(exam) {
  if (exam.teacher) {
    return exam.teacher;
  }
  
  // Return default structure
  return {
    firstName: '',
    lastName: '',
    email: '',
    organization: 'SRYEM - Ministère de l\'Éducation nationale de Sealand',
    title: 'Enseignant',
  };
}


function previewVCard(teacherData) {
  const validation = validateVCardData(teacherData);
  
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }
  
  const content = generateVCardContent(teacherData);
  
  return {
    valid: true,
    content,
    teacher: `${teacherData.firstName} ${teacherData.lastName}`,
  };
}

module.exports = {
  generateVCardFile,
  generateVCardContent,
  validateVCardData,
  validateEmail,
  validatePhone,
  getDefaultVCardFilename,
  extractTeacherFromExam,
  previewVCard,
};

