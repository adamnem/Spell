/**
 * Built-in class spelling lists.
 * These are shared with all users who load the app.
 * To add a new list, add an entry to CLASS_LISTS below.
 */
const ClassLists = (() => {

  const CLASS_LISTS = [
    {
      id: 'class-test-2026-02-02',
      label: 'Long e/ee vowel sounds',
      testDate: '2026-02-02',
      words: [
        'succeeded', 'money', 'enemy', 'centipede', 'experience',
        'believe', 'secret', 'increase', 'chimney', 'tedious',
        'fancy', 'degree', 'athlete', 'chief', 'grease',
        'scenic', 'chariot', 'stadium',
        'electricity',
        'almost', 'really',
      ],
      tags: {
        'electricity': 'content word',
        'almost': 'challenge word',
        'really': 'challenge word',
      },
      defaultTag: 'long e/ee vowel sounds',
    },
    {
      id: 'class-test-2026-02-10',
      label: 'Long a /ae/ vowel sounds',
      testDate: '2026-02-10',
      words: [
        'daydreams', 'subway', 'daisies', 'awaited', 'yesterday',
        'crayons', 'betrayer', 'explain', 'mermaid', 'payment',
        'giveaway', 'great', 'dainty', 'breaker', 'obtain',
        'ballplayers', 'beefsteak', 'trainees',
        'straight',
        'family', 'young',
      ],
      tags: {
        'straight': 'content word',
        'family': 'challenge word',
        'young': 'challenge word',
      },
      defaultTag: 'long a /ae/ vowel sounds',
    },
  ];

  /**
   * Load built-in class lists into storage if they haven't been added yet.
   * Called once on app startup.
   */
  function init() {
    const loaded = localStorage.getItem('spell_classListsLoaded') || '';
    const loadedIds = loaded ? loaded.split(',') : [];

    for (const cl of CLASS_LISTS) {
      if (loadedIds.includes(cl.id)) continue;

      const wordList = {
        id: cl.id,
        weekNumber: null,
        label: cl.label,
        date: null,
        testDate: cl.testDate,
        words: cl.words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0),
        tags: cl.tags || {},
        defaultTag: cl.defaultTag || null,
        createdAt: new Date().toISOString(),
        isBuiltIn: true,
      };

      Storage.saveWordList(wordList);
      loadedIds.push(cl.id);
    }

    localStorage.setItem('spell_classListsLoaded', loadedIds.join(','));
  }

  function getClassLists() {
    return CLASS_LISTS;
  }

  return { init, getClassLists };
})();
