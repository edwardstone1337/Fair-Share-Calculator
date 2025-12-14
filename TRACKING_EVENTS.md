# Google Analytics Event Tracking Reference

This document provides a comprehensive reference for all Google Analytics 4 (GA4) events tracked in the Fair Share Calculator application.

## Quick Reference Table

| Event Name | When Fired | Key Parameters |
|------------|------------|----------------|
| `input_started` | First non-empty input per field (once per page load) | `field_id`, `field_type` |
| `input_completed` | Blur with non-empty changed value | `field_id`, `field_type`, `has_value` |
| `validation_error` | Blur with invalid field | `field_id`, `error_type` |
| `expense_added` | Add expense button clicked | `expense_count_after`, `expense_row_index` |
| `expense_deleted` | Delete expense button clicked | `expense_count_after`, `expense_row_index` |
| `delete_expense_clicked` | Delete expense button clicked | (none) |
| `calculate_clicked` | Calculate button clicked | (none) |
| `calculate_attempt` | Calculation completes (success/error) | `status`, `expense_count`, `has_names`, `has_labels`, `total_expense_bucket`, `error_type` (if error), `time_to_calculate_ms` (if success), `returning_user` |
| `results_viewed` | Results panel becomes visible | `expense_count`, `has_names`, `has_labels`, `total_expense_bucket`, `split_ratio_bucket`, `returning_user` |
| `share_results` | Share button clicked and copy succeeds | `method: 'copy_link'` |
| `salary_toggle` | Show/hide salary clicked | `field_id`, `visibility_state` |
| `add_expense_clicked` | Add expense button clicked | (none) |
| `back_to_edit_clicked` | Back to edit button clicked | (none) |
| `data_restored` | Data restored from localStorage | `has_names`, `has_salaries`, `has_expenses`, `expense_count` |

---

## Detailed Event Descriptions

### Input Tracking Events

#### `input_started`

**What it tracks**: When a user begins interacting with a form field by entering their first non-empty value.

**When it fires**: 
- Once per field per page load
- Only fires when the field transitions from empty to non-empty
- **Does NOT fire for fields that are pre-filled from localStorage** (returning users)
- Prevents spam from paste, autofill, or re-editing

**Parameters**:
- `field_id` (string): The ID of the input field
  - Possible values: `'name1'`, `'name2'`, `'salary1'`, `'salary2'`, `'expense1'`, `'expense2'`, etc., `'expenseLabel1'`, `'expenseLabel2'`, etc.
- `field_type` (string): The type of field
  - Possible values: `'name'`, `'salary'`, `'expense_amount'`, `'expense_label'`

**Example event**:
```javascript
{
  event: 'input_started',
  field_id: 'salary1',
  field_type: 'salary'
}
```

**What insights it provides**:
- Which fields users interact with most
- Form completion rates (comparing started vs completed)
- User engagement with optional vs required fields

---

#### `input_completed`

**What it tracks**: When a user finishes filling out a field (blurs the field) with a non-empty value that has changed.

**When it fires**: 
- On blur event (when user leaves the field)
- Only if the value is non-empty
- Only if the value changed since the field was focused

**Parameters**:
- `field_id` (string): The ID of the input field
- `field_type` (string): The type of field
- `has_value` (boolean): Always `true` (redundant but kept for consistency)

**Example event**:
```javascript
{
  event: 'input_completed',
  field_id: 'name1',
  field_type: 'name',
  has_value: true
}
```

**What insights it provides**:
- Form completion rates
- Which fields users actually fill out vs skip
- User behavior patterns (do they complete names, or skip them?)

---

#### `validation_error`

**What it tracks**: When a user leaves a field (blur) and the field has a validation error.

**When it fires**: 
- On blur for key fields (salary1, salary2, expense amounts)
- Only when the field is invalid
- Helps identify early friction points before users click Calculate

**Parameters**:
- `field_id` (string): The ID of the input field
- `error_type` (string): The type of validation error
  - Possible values:
    - `'missing'`: Field is required but empty
    - `'invalid_format'`: Value is not a valid number or is negative
    - `'negative_value'`: Value is negative (not applicable currently, but reserved)
    - `'too_large'`: Value exceeds maximum allowed (999,999,999)
    - `'empty_expense_with_label'`: Expense has a label but no amount

**Example event**:
```javascript
{
  event: 'validation_error',
  field_id: 'salary1',
  error_type: 'missing'
}
```

**What insights it provides**:
- Early friction points (errors before Calculate button)
- Most common validation errors
- User experience issues (are users confused by validation?)

---

### Expense Management Events

#### `expense_added`

**What it tracks**: When a user adds a new expense row to the calculator.

**When it fires**: Immediately when the "Add Expense" button is clicked and the new row is added to the DOM.

**Parameters**:
- `expense_count_after` (number): The total number of expense rows after adding this one
- `expense_row_index` (number): The 0-based index of the newly added row

**Example event**:
```javascript
{
  event: 'expense_added',
  expense_count_after: 3,
  expense_row_index: 2
}
```

**What insights it provides**:
- How many expenses users typically add
- User behavior: do they add one expense and calculate, or build a full list?
- Feature usage patterns

---

#### `delete_expense_clicked`

**What it tracks**: When a user clicks the delete button on an expense row.

**When it fires**: Immediately when the delete button is clicked (before deletion logic runs).

**Parameters**: None

**Example event**:
```javascript
{
  event: 'delete_expense_clicked'
}
```

**What insights it provides**:
- User engagement with the delete expense feature
- Can be compared with `expense_deleted` to ensure consistency

---

#### `expense_deleted`

**What it tracks**: When a user deletes an expense row from the calculator.

**When it fires**: Immediately when an expense row is successfully deleted (cannot delete the first row).

**Parameters**:
- `expense_count_after` (number): The total number of expense rows after deletion
- `expense_row_index` (number): The 0-based index of the deleted row (before deletion)

**Example event**:
```javascript
{
  event: 'expense_deleted',
  expense_count_after: 2,
  expense_row_index: 1
}
```

**What insights it provides**:
- How often users delete expenses (correction behavior)
- Average number of expenses users work with
- User workflow patterns

---

### Calculation Events

#### `calculate_clicked`

**What it tracks**: When a user clicks the Calculate button.

**When it fires**: Immediately when the Calculate button is clicked, before any validation or calculation logic runs.

**Parameters**: None

**Example event**:
```javascript
{
  event: 'calculate_clicked'
}
```

**What insights it provides**:
- User intent to calculate
- Can be compared with `calculate_attempt` to detect bugs (e.g., if clicked but nothing happens due to rate limiting or errors)

---

#### `calculate_attempt`

**What it tracks**: The result of a calculation attempt, whether successful or failed.

**When it fires**: After validation and calculation logic completes (or fails).

**Parameters** (varies by status):

**On Success**:
- `status` (string): `'success'`
- `expense_count` (number): Number of valid expenses calculated
- `has_names` (boolean): Whether at least one name was provided
- `has_labels` (boolean): Whether at least one expense has a custom label (not just "Expense")
- `total_expense_bucket` (string): Bucketed total expense amount
  - Possible values: `'0-100'`, `'100-250'`, `'250-500'`, `'500-1000'`, `'1000+'`
- `time_to_calculate_ms` (number): Time from page load to successful calculation (in milliseconds)
- `returning_user` (boolean): Whether data was restored from localStorage

**On Error**:
- `status` (string): `'error'`
- `error_type` (string): The type of error
  - Possible values:
    - `'rate_limited'`: Calculation was rate limited
    - `'missing_salary'`: One or both salaries are missing or invalid
    - `'missing_expense'`: No valid expenses provided
    - `'validation_error'`: General validation error
- `returning_user` (boolean): Whether data was restored from localStorage

**Example events**:

Success:
```javascript
{
  event: 'calculate_attempt',
  status: 'success',
  expense_count: 3,
  has_names: true,
  has_labels: true,
  total_expense_bucket: '500-1000',
  time_to_calculate_ms: 45230,
  returning_user: false
}
```

Error:
```javascript
{
  event: 'calculate_attempt',
  status: 'error',
  error_type: 'missing_expense',
  returning_user: true
}
```

**What insights it provides**:
- Success vs error rates
- Average number of expenses per calculation
- Feature usage (names, labels)
- Performance metrics (time to calculate)
- Common error patterns

---

#### `results_viewed`

**What it tracks**: When the results panel becomes visible to the user after a successful calculation.

**When it fires**: When `showStep('results')` is called and the results panel is displayed.

**Parameters**:
- `expense_count` (number): Number of expenses that were calculated
- `has_names` (boolean): Whether names were provided
- `has_labels` (boolean): Whether expense labels were used
- `total_expense_bucket` (string): Bucketed total expense amount
- `split_ratio_bucket` (string): Bucketed income split ratio
  - Possible values: `'50-50'`, `'60-40'`, `'70-30'`, `'80-20'`, `'other'`
- `returning_user` (boolean): Whether data was restored from localStorage

**Example event**:
```javascript
{
  event: 'results_viewed',
  expense_count: 2,
  has_names: true,
  has_labels: false,
  total_expense_bucket: '250-500',
  split_ratio_bucket: '60-40',
  returning_user: true
}
```

**What insights it provides**:
- User journey completion (did they see results?)
- Typical calculation patterns (expense counts, split ratios)
- Feature adoption (names, labels)

---

### Button Action Events

#### `add_expense_clicked`

**What it tracks**: When a user clicks the "Add Expense" button.

**When it fires**: Immediately when the button is clicked.

**Parameters**: None

**Example event**:
```javascript
{
  event: 'add_expense_clicked'
}
```

**What insights it provides**:
- User engagement with the add expense feature
- Can be compared with `expense_added` to ensure consistency

---

#### `back_to_edit_clicked`

**What it tracks**: When a user clicks the "← Edit details" button to return to the input form.

**When it fires**: Immediately when the button is clicked.

**Parameters**: None

**Example event**:
```javascript
{
  event: 'back_to_edit_clicked'
}
```

**What insights it provides**:
- User behavior: do they edit after seeing results?
- Iteration patterns (how often users refine their calculations)

---

#### `share_results`

**What it tracks**: When a user successfully shares the calculation results by copying a link to their clipboard.

**When it fires**: After the share URL is successfully copied to the clipboard.

**Parameters**:
- `method` (string): The sharing method used
  - Current value: `'copy_link'`
  - Future: May include `'native_share'` if Web Share API is implemented

**Example event**:
```javascript
{
  event: 'share_results',
  method: 'copy_link'
}
```

**What insights it provides**:
- User engagement depth (sharing vs just calculating)
- Feature adoption
- Viral potential

---

#### `salary_toggle`

**What it tracks**: When a user toggles the visibility of a salary field (show/hide).

**When it fires**: When the show/hide icon is clicked for a salary field.

**Parameters**:
- `field_id` (string): The ID of the salary field
  - Possible values: `'salary1'`, `'salary2'`
- `visibility_state` (string): The new visibility state
  - Possible values: `'visible'`, `'hidden'`

**Example event**:
```javascript
{
  event: 'salary_toggle',
  field_id: 'salary1',
  visibility_state: 'visible'
}
```

**What insights it provides**:
- Privacy feature usage
- User preferences for showing/hiding sensitive data

---

### Data Restoration Events

#### `data_restored`

**What it tracks**: When a returning user's data is restored from localStorage on page load.

**When it fires**: 
- When `restoreFormDataFromLocalStorage()` successfully restores any data
- Only fires if at least one type of data (names, salaries, or expenses) was restored
- Sets a global `returningUser` flag that is included in subsequent events

**Parameters**:
- `has_names` (boolean): Whether names were restored from localStorage
- `has_salaries` (boolean): Whether salaries were restored from localStorage
- `has_expenses` (boolean): Whether expenses were restored from localStorage
- `expense_count` (number): Number of expenses restored (0 if no expenses were restored)

**Example event**:
```javascript
{
  event: 'data_restored',
  has_names: true,
  has_salaries: true,
  has_expenses: true,
  expense_count: 3
}
```

**What insights it provides**:
- How many users return and use saved data vs start fresh
- Which types of data users typically save (names, salaries, expenses)
- localStorage feature adoption
- User retention patterns

**Note**: After this event fires, the `returning_user` flag will be `true` in subsequent `calculate_attempt` and `results_viewed` events, allowing you to compare behavior between returning and new users.

---

## Parameter Reference

### Field IDs

- `name1`: First person's name input
- `name2`: Second person's name input
- `salary1`: First person's salary input
- `salary2`: Second person's salary input
- `expense1`, `expense2`, etc.: Expense amount inputs (dynamically numbered)
- `expenseLabel1`, `expenseLabel2`, etc.: Expense label inputs (dynamically numbered)

### Field Types

- `name`: Name input field
- `salary`: Salary input field
- `expense_amount`: Expense amount input field
- `expense_label`: Expense label input field

### Error Types

- `missing`: Required field is empty
- `invalid_format`: Value is not a valid number or format
- `negative_value`: Value is negative (reserved for future use)
- `too_large`: Value exceeds maximum allowed (999,999,999)
- `empty_expense_with_label`: Expense has a label but no amount
- `rate_limited`: Calculation was rate limited
- `missing_salary`: One or both salaries are missing or invalid
- `missing_expense`: No valid expenses provided
- `validation_error`: General validation error

### Bucketing Values

**Total Expense Buckets**:
- `'0-100'`: Total expenses between $0 and $100
- `'100-250'`: Total expenses between $100 and $250
- `'250-500'`: Total expenses between $250 and $500
- `'500-1000'`: Total expenses between $500 and $1,000
- `'1000+'`: Total expenses over $1,000

**Split Ratio Buckets**:
- `'50-50'`: Income split is approximately 50-50 (45% to <55% range, inclusive lower bound, exclusive upper)
- `'60-40'`: Income split is approximately 60-40 (55% to <65% range, inclusive lower bound, exclusive upper)
- `'70-30'`: Income split is approximately 70-30 (65% to <75% range, inclusive lower bound, exclusive upper)
- `'80-20'`: Income split is approximately 80-20 (75% to <85% range, inclusive lower bound, exclusive upper)
- `'other'`: Income split doesn't fit into the above categories

**Note**: The bucket boundaries are mutually exclusive. For example, exactly 55% goes to `'60-40'` (not `'50-50'`), and exactly 65% goes to `'70-30'` (not `'60-40'`).

---

## User Journey Funnel

The tracking enables analysis of this user journey:

1. **`input_started`** → User begins filling form (once per field per page load)
2. **`input_completed`** → User completes fields (blur with non-empty value)
3. **`calculate_clicked`** → User clicks calculate button
4. **`calculate_attempt`** (success) → Calculation succeeds
5. **`results_viewed`** → User sees results
6. **`share_results`** → User shares results

### Funnel Analysis Examples

**Completion Rate**: Compare `input_started` counts to `input_completed` counts to see field completion rates.

**Conversion Rate**: Compare `calculate_clicked` to `results_viewed` to see how many users successfully complete calculations.

**Engagement Depth**: Compare `results_viewed` to `share_results` to see how many users share their results.

---

## Common Analysis Queries

### Form Completion Analysis

**Question**: What percentage of users enter names vs skip them?

**Analysis**: 
- Count `input_completed` events where `field_type = 'name'`
- Compare with total `calculate_attempt` events
- Calculate percentage: `(name_completions / total_calculations) * 100`

### Expense Behavior Analysis

**Question**: Do users add one expense and bounce, or build a full list?

**Analysis**:
- Count `expense_added` events per session
- Group by `expense_count_after` to see distribution
- Look at `calculate_attempt` events with `expense_count = 1` vs `expense_count > 1`

### Error Pattern Analysis

**Question**: What validation errors occur most frequently?

**Analysis**:
- Count `validation_error` events
- Group by `error_type`
- Compare with `calculate_attempt` events with `status = 'error'`

### Performance Analysis

**Question**: How fast do users get value from the calculator?

**Analysis**:
- Look at `calculate_attempt` events with `status = 'success'`
- Analyze `time_to_calculate_ms` parameter
- Calculate average, median, and percentiles

### Feature Adoption Analysis

**Question**: How many users use expense labels?

**Analysis**:
- Count `calculate_attempt` events where `has_labels = true`
- Compare with total successful calculations
- Calculate percentage: `(with_labels / total_successful) * 100`

### Returning User Analysis

**Question**: How many users return and use saved data?

**Analysis**:
- Count `data_restored` events to see how many users have saved data
- Analyze `has_names`, `has_salaries`, `has_expenses` to see what data users typically save
- Compare `returning_user = true` vs `returning_user = false` in `calculate_attempt` events

**Question**: Do returning users behave differently?

**Analysis**:
- Compare `time_to_calculate_ms` for `returning_user = true` vs `returning_user = false`
- Compare success rates between returning and new users
- Compare feature usage (names, labels) between returning and new users
- Analyze if returning users calculate faster (they already have data filled in)

**Question**: What types of data do returning users typically save?

**Analysis**:
- Count `data_restored` events grouped by `has_names`, `has_salaries`, `has_expenses`
- Calculate percentages: e.g., `(has_names_count / total_data_restored) * 100`
- Understand which features users find valuable enough to save

---

## Privacy Considerations

All tracking follows privacy best practices:

- **No PII**: No actual names, salaries, or expense labels are tracked
- **Bucketing**: Financial amounts are bucketed to prevent high-cardinality and sensitivity issues
- **Boolean Flags**: Only boolean flags (`has_names`, `has_labels`) are tracked, not actual content
- **Interaction Patterns**: Only interaction patterns are tracked, not personal data

---

## Implementation Notes

- Events are fired using `gtag('event', eventName, params)` format (GA4 standard)
- Tracking failures are caught and logged but never break the application
- Input tracking uses per-field flags to prevent spam (once per field per page load)
- All events fire asynchronously and won't block user interactions

---

## Last Updated

This documentation was last updated when the tracking implementation was completed. For questions or updates, refer to the implementation in `script.js`.

