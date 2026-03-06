import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.lofty.com/v1.0',
  headers: {
    'Authorization': 'token eyJhbGciOiJIUzI1NiJ9.eyJleHQiOjMzMzQ4NDQ2MTE5MjMsInVzZXJfaWQiOjg0NDc3MDUzODQwOTE3NSwic2NvcGUiOiI1IiwiaWF0IjoxNzU4MDQ0NjExOTIzfQ.4OjsEppCvv2DZhtCmFnzLnKYT_HHAqJPMSWND8vqnXM',
    'Content-Type': 'application/json'
  },
  validateStatus: () => true
});

console.log('Fetching all carl.pratt+lofty leads...\n');

// Fetch leads in pages
let allOurLeads = [];
let page = 0;
const pageSize = 100;

while (true) {
  const response = await client.get('/leads', {
    params: {
      limit: pageSize,
      offset: page * pageSize
    }
  });

  if (response.status !== 200 || !response.data.leads || response.data.leads.length === 0) {
    break;
  }

  const ourLeads = response.data.leads.filter(l =>
    l.emails && l.emails[0] && /carl\.pratt\+lofty_\d{1,4}@constantcontact\.com/.test(l.emails[0])
  );

  allOurLeads.push(...ourLeads);

  console.log(`  Fetched page ${page + 1}: found ${ourLeads.length} our leads (${allOurLeads.length} total)`);

  // Stop if we found all 1000 or if no more pages
  if (response.data.leads.length < pageSize || allOurLeads.length >= 1000) {
    break;
  }

  page++;
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`\nTotal leads found: ${allOurLeads.length}`);
console.log('Starting email validation updates...\n');

let successCount = 0;
let errorCount = 0;
let retryCount = 0;
const startTime = Date.now();

for (let i = 0; i < allOurLeads.length; i++) {
  const lead = allOurLeads[i];

  const userEmailList = [{
    userId: lead.leadUserId,
    familyMemberId: 0,
    email: lead.emails[0],
    valid: true,
    verified: false,
    bounced: false,
    isPrimary: true,
    primary: true,
    teamId: lead.teamId,
    deleteFlag: false,
    description: ""
  }];

  const updatePayload = {
    firstName: lead.firstName,
    lastName: lead.lastName,
    emails: lead.emails,
    phones: lead.phones,
    userEmailList: userEmailList
  };

  let attempts = 0;
  let success = false;

  while (attempts < 3 && !success) {
    const updateResponse = await client.put(`/leads/${lead.leadId}`, updatePayload);

    if (updateResponse.status === 200) {
      successCount++;
      success = true;
    } else if (updateResponse.status === 429) {
      // Rate limited - wait longer
      retryCount++;
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
    } else {
      errorCount++;
      console.log(`✗ Failed ${lead.emails[0]}: ${updateResponse.status}`);
      break;
    }
  }

  // Progress updates every 50 leads
  if (successCount % 50 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (successCount / elapsed).toFixed(1);
    const remaining = allOurLeads.length - successCount;
    const eta = (remaining / rate).toFixed(0);
    console.log(`  Progress: ${successCount}/${allOurLeads.length} (${rate}/sec, ETA: ${eta}s, retries: ${retryCount})`);
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 150));
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n\n=== FINAL RESULTS ===`);
console.log(`Total leads: ${allOurLeads.length}`);
console.log(`Successfully updated: ${successCount}`);
console.log(`Failed: ${errorCount}`);
console.log(`Retry attempts: ${retryCount}`);
console.log(`Total time: ${totalTime} seconds (${(totalTime / 60).toFixed(1)} minutes)`);
console.log(`Average rate: ${(successCount / totalTime).toFixed(1)} leads/sec`);
console.log(`\n✅ All ${successCount} emails are now marked as valid!`);
