import { click, fillIn, findAll, currentURL, visit, waitUntil } from '@ember/test-helpers';
import jquerySelect from 'hospitalrun/tests/helpers/deprecated-jquery-select';
import { findWithAssert } from 'ember-native-dom-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import runWithPouchDump from 'hospitalrun/tests/helpers/run-with-pouch-dump';
import typeAheadFillIn from 'hospitalrun/tests/helpers/typeahead-fillin';
import { waitToAppear, waitToDisappear } from 'hospitalrun/tests/helpers/wait-to-appear';
import { authenticateUser } from 'hospitalrun/tests/helpers/authenticate-user';

module('Acceptance | medication', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /medication', function(assert) {
    return runWithPouchDump('default', async function() {
      await authenticateUser();
      await visit('/medication');

      assert.equal(currentURL(), '/medication');
      findWithAssert(jquerySelect('button:contains(new request)'));
      findWithAssert(jquerySelect('button:contains(dispense medication)'));
      findWithAssert(jquerySelect('button:contains(return medication)'));
      findWithAssert(jquerySelect('p:contains(No items found. )'));
      findWithAssert(jquerySelect('a:contains(Create a new medication request?)'));
    });
  });

  test('creating a new medication request', function(assert) {
    return runWithPouchDump('medication', async function() {
      await authenticateUser();
      await visit('/medication/edit/new');
      assert.equal(currentURL(), '/medication/edit/new');

      await typeAheadFillIn('.test-patient-input', 'Lennex Zinyando - P00017');
      await waitToAppear('.have-inventory-items');
      await typeAheadFillIn('.test-medication-input', 'Biogesic - m00001 (950 available)');
      await fillIn('textarea', '30 Biogesic Pills');
      await fillIn('.test-quantity-input input', '30');
      await waitToDisappear('.disabled-btn:contains(Add)');
      await click(jquerySelect('button:contains(Add)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Medication Request Saved', 'New medication request has been saved');

      await click(jquerySelect('button:contains(Ok)'));
      await click(jquerySelect('button:contains(Return)'));

      await waitUntil(() => currentURL() === '/medication');

      assert.equal(currentURL(), '/medication');
      assert.dom('tr').exists({ count: 3 }, 'New medication request is now displayed');
    });
  });

  test('fulfilling a medication request', function(assert) {
    return runWithPouchDump('medication', async function() {
      await authenticateUser();
      await visit('/medication');
      await click(jquerySelect('button:contains(Fulfill)'));
      assert.dom('.patient-summary').exists({ count: 1 }, 'Patient summary is displayed');

      await waitToAppear('.inventory-location option:contains(No Location)');
      await click(jquerySelect('button:contains(Fulfill)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Medication Request Fulfilled', 'Medication Request has been Fulfilled');

      await click(jquerySelect('button:contains(Ok)'));
      await click(jquerySelect('button:contains(Return)'));

      await waitUntil(() => currentURL() === '/medication');

      assert.equal(currentURL(), '/medication');
      findWithAssert(jquerySelect('p:contains(No items found. )'));
      findWithAssert(jquerySelect('a:contains(Create a new medication request?)'));
    });
  });

  test('complete a medication request', function(assert) {
    return runWithPouchDump('medication', async function() {
      await authenticateUser();
      await visit('/medication/completed');
      assert.dom('.clickable').doesNotExist('Should have 0 completed request');

      await visit('/medication');
      await click(jquerySelect('button:contains(Fulfill)'));
      assert.dom('.patient-summary').exists({ count: 1 }, 'Patient summary is displayed');

      await waitToAppear('.inventory-location option:contains(No Location)');
      await click(jquerySelect('button:contains(Fulfill)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Medication Request Fulfilled', 'Medication Request has been Fulfilled');

      await click(jquerySelect('button:contains(Ok)'));
      await visit('/medication/completed');
      assert.equal(currentURL(), '/medication/completed');
      assert.dom('.clickable').exists({ count: 1 }, 'Should have 1 completed request');
    });
  });

  test('returning medication', function(assert) {
    return runWithPouchDump('medication', async function() {
      await authenticateUser();
      await visit('/medication/return/new');
      assert.equal(currentURL(), '/medication/return/new');

      await waitToAppear('.have-inventory-items');
      await typeAheadFillIn('.test-medication-input', 'Biogesic - m00001');
      await fillIn('.test-medication-quantity input', 30);
      await waitToDisappear('.disabled-btn:contains(Return Medication)');
      await click(jquerySelect('button:contains(Return Medication)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Medication Returned', 'Medication has been return successfully');
      await click(jquerySelect('button:contains(Ok)'));

      await waitUntil(() => currentURL() === '/medication');

      assert.equal(currentURL(), '/medication');
    });
  });

  test('Searching medications', function(assert) {
    return runWithPouchDump('medication', async function() {
      await authenticateUser();
      await visit('/medication');

      await fillIn('[role="search"] div input', 'Biogesic');
      await click('.glyphicon-search');

      assert.equal(currentURL(), '/medication/search/Biogesic', 'Searched for Medication Title: Biogesic');
      assert.dom('.clickable').exists({ count: 1 }, 'There is one search item');

      await fillIn('[role="search"] div input', 'gesic');
      await click('.glyphicon-search');

      assert.equal(currentURL(), '/medication/search/gesic', 'Searched for all lower case gesic');
      assert.dom('.clickable').exists({ count: 1 }, 'There is one search item');

      await fillIn('[role="search"] div input', 'hradmin');
      await click('.glyphicon-search');

      assert.equal(currentURL(), '/medication/search/hradmin', 'Searched for Prescriber: hradmin');
      assert.notEqual(findAll('.clickable').length, 0, 'There are one or more search item');

      await fillIn('[role="search"] div input', '60 Biogesic Pills');
      await click('.glyphicon-search');

      assert.equal(currentURL(), '/medication/search/60%20Biogesic%20Pills', 'Searched for Prescription: 60 Biogesic Pills');
      assert.dom('.clickable').exists({ count: 1 }, 'There is one search item');

      await fillIn('[role="search"] div input', 'ItemNotFound');
      await click('.glyphicon-search');

      assert.equal(currentURL(), '/medication/search/ItemNotFound', 'Searched for ItemNotFound');
      assert.dom('.clickable').doesNotExist('There is no search result');
    });
  });
});
