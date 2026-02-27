const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a unique random 5-digit ID number
 */
async function generateUniqueId() {
  const { data } = await supabase.from('members').select('id_number');
  const existing = new Set((data || []).map(r => r.id_number));
  let id;
  do {
    id = String(Math.floor(10000 + Math.random() * 90000));
  } while (existing.has(id));
  return id;
}

/**
 * Create a new member and return the created record
 */
async function createMember(firstName, lastName, photoData) {
  const idNumber = await generateUniqueId();
  const { data, error } = await supabase
    .from('members')
    .insert({ first_name: firstName, last_name: lastName, id_number: idNumber, photo_data: photoData })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get all members (for admin view)
 */
async function getAllMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, id_number, photo_data, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get all members without photo data (for export)
 */
async function getAllMembersForExport() {
  const { data, error } = await supabase
    .from('members')
    .select('first_name, last_name, id_number, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create a member with a specific ID number (for Excel import)
 * Throws an error if the ID number already exists
 */
async function createMemberWithId(firstName, lastName, idNumber, photoData) {
  // Check if ID already exists
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('id_number', idNumber)
    .single();

  if (existing) {
    throw new Error(`ID number ${idNumber} already exists`);
  }

  const { error } = await supabase
    .from('members')
    .insert({ first_name: firstName, last_name: lastName, id_number: idNumber, photo_data: photoData || null });

  if (error) throw new Error(error.message);
}

/**
 * Update a member's photo by database id
 */
async function updateMemberPhoto(id, photoData) {
  const { error } = await supabase
    .from('members')
    .update({ photo_data: photoData })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Get a single member by database id (primary key)
 */
async function getMemberById(id) {
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, id_number, photo_data, created_at')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null;
}

/**
 * Update a member's info (name and/or ID number)
 */
async function updateMember(id, firstName, lastName, idNumber) {
  // If changing ID number, check it's not taken by another member
  if (idNumber) {
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('id_number', idNumber)
      .neq('id', id)
      .single();

    if (existing) {
      throw new Error(`ID number ${idNumber} already exists`);
    }
  }

  const updates = {};
  if (firstName) updates.first_name = firstName;
  if (lastName) updates.last_name = lastName;
  if (idNumber) updates.id_number = idNumber;

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a member by ID
 */
async function deleteMember(id) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

module.exports = {
  createMember,
  createMemberWithId,
  getAllMembers,
  getAllMembersForExport,
  getMemberById,
  updateMember,
  updateMemberPhoto,
  deleteMember,
  generateUniqueId
};
