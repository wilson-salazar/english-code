-- Add phonetics to all vocabulary words across all scenarios

-- Scenario 2: Writing a Pull Request
update vocabulary set phonetic = '/pʊl rɪˈkwest/' where word = 'pull request';
update vocabulary set phonetic = '/bræntʃ/'        where word = 'branch';
update vocabulary set phonetic = '/mɜːrdʒ/'        where word = 'merge';
update vocabulary set phonetic = '/rɪˈvjuː/'       where word = 'review';
update vocabulary set phonetic = '/ˈkɒnflɪkt/'     where word = 'conflict';
update vocabulary set phonetic = '/dɪf/'            where word = 'diff';
update vocabulary set phonetic = '/əˈpruːv/'        where word = 'approve';

-- Scenario 3: Daily Standup
update vocabulary set phonetic = '/ˈblɒkər/'        where word = 'blocker';
update vocabulary set phonetic = '/ɪn ˈprəʊɡres/'  where word = 'in progress';
update vocabulary set phonetic = '/pɪk ʌp/'         where word = 'pick up';
update vocabulary set phonetic = '/iː tiː ˈeɪ/'     where word = 'ETA';
update vocabulary set phonetic = '/dɪˈpendənsi/'    where word = 'dependency';
update vocabulary set phonetic = '/sɪŋk/'            where word = 'sync';
update vocabulary set phonetic = '/ræp ʌp/'          where word = 'wrap up';

-- Scenario 4: Reading an Error Log
update vocabulary set phonetic = '/ɪkˈsepʃən/'      where word = 'exception';
update vocabulary set phonetic = '/stæk treɪs/'      where word = 'stack trace';
update vocabulary set phonetic = '/ˈtaɪmaʊt/'        where word = 'timeout';
update vocabulary set phonetic = '/nʌl/'              where word = 'null';
update vocabulary set phonetic = '/lɒɡ/'              where word = 'log';
update vocabulary set phonetic = '/ˈendpɔɪnt/'       where word = 'endpoint';
update vocabulary set phonetic = '/ˈpeɪləʊd/'        where word = 'payload';

-- Scenario 5: Writing Test Cases
update vocabulary set phonetic = '/test keɪs/'       where word = 'test case';
update vocabulary set phonetic = '/pɑːs/'             where word = 'pass';
update vocabulary set phonetic = '/feɪl/'             where word = 'fail';
update vocabulary set phonetic = '/rɪˈɡreʃən/'       where word = 'regression';
update vocabulary set phonetic = '/edʒ keɪs/'         where word = 'edge case';
update vocabulary set phonetic = '/ˈkʌvərɪdʒ/'       where word = 'coverage';
update vocabulary set phonetic = '/əˈsɜːrʃən/'        where word = 'assertion';

-- Scenario 6: Asking for Help in Slack
update vocabulary set phonetic = '/θred/'             where word = 'thread';
update vocabulary set phonetic = '/ˈsnɪpɪt/'          where word = 'snippet';
update vocabulary set phonetic = '/ˌriːprəˈdjuːs/'   where word = 'reproduce';
update vocabulary set phonetic = '/ˈkɒntekst/'        where word = 'context';
update vocabulary set phonetic = '/ˈmenʃən/'           where word = 'mention';
update vocabulary set phonetic = '/blɒk/'              where word = 'block';
update vocabulary set phonetic = '/ˈeɪsɪŋk/'          where word = 'async';

-- Scenario 7: Writing Release Notes
update vocabulary set phonetic = '/rɪˈliːs/'          where word = 'release';
update vocabulary set phonetic = '/ˈtʃeɪndʒlɒɡ/'     where word = 'changelog';
update vocabulary set phonetic = '/ˈbreɪkɪŋ tʃeɪndʒ/' where word = 'breaking change';
update vocabulary set phonetic = '/ˈdeprəkeɪtɪd/'     where word = 'deprecated';
update vocabulary set phonetic = '/ˈfiːtʃər/'          where word = 'feature';
update vocabulary set phonetic = '/fɪks/'              where word = 'fix';
update vocabulary set phonetic = '/ˈrəʊlbæk/'         where word = 'rollback';

-- Scenario 8: Code Review Feedback
update vocabulary set phonetic = '/el dʒiː tiː em/'   where word = 'LGTM';
update vocabulary set phonetic = '/ˈnɪtpɪk/'          where word = 'nitpick';
update vocabulary set phonetic = '/səˈdʒestʃən/'       where word = 'suggestion';
update vocabulary set phonetic = '/riːˈfæktər/'        where word = 'refactor';
update vocabulary set phonetic = '/ˈɪnlaɪn/'           where word = 'inline';

-- Scenario 9: Writing a Post-Mortem
update vocabulary set phonetic = '/ˈɪnsɪdənt/'        where word = 'incident';
update vocabulary set phonetic = '/ruːt kɔːz/'         where word = 'root cause';
update vocabulary set phonetic = '/ˈɪmpækt/'           where word = 'impact';
update vocabulary set phonetic = '/ˌmɪtɪˈɡeɪʃən/'    where word = 'mitigation';
update vocabulary set phonetic = '/ˈtaɪmlaɪn/'        where word = 'timeline';
update vocabulary set phonetic = '/ˈækʃən ˈaɪtəm/'   where word = 'action item';
update vocabulary set phonetic = '/ˈaʊtɪdʒ/'          where word = 'outage';
