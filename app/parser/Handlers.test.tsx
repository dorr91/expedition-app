import {mount} from 'enzyme'
import {handleAction, getEventParameters, loadCombatNode} from './Handlers'
import {defaultQuestContext} from '../reducers/QuestTypes'
import {ParserNode} from './Node'

declare var global: any;

var cheerio: any = require('cheerio');
var window: any = cheerio.load('<div>');

describe('Handlers', () => {
  describe('combat', () => {
    it('parses enemies', () => {
      // "Unknown" enemies are given tier 1.
      // Known enemies' tier is parsed from constants.
      var result = loadCombatNode(cheerio.load('<combat><e>Test</e><e>Lich</e><e>lich</e><event on="win"></event><event on="lose"></event></combat>')('combat'), defaultQuestContext());
      expect(result.enemies).toEqual([
        {name: 'Test', tier: 1},
        {name: 'Lich', tier: 4, class: 'Undead'},
        {name: 'Lich', tier: 4, class: 'Undead'}
      ]);
    })

    it('hides enemies conditionally', () => {
      var node = cheerio.load('<combat><e>a</e><e if="a">Test</e><event on="win"></event><event on="lose"></event></combat>')('combat');
      var expected = [{name: 'a', tier: 1}];

      // Unassigned
      let context = defaultQuestContext();
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual(expected);

      // Boolean
      context = defaultQuestContext();
      context.scope.a = false;
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual(expected);

      // Zero
      context = defaultQuestContext();
      context.scope.a = 0;
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual(expected);
    });

    it('shows enemies conditionally', () => {
      var node = cheerio.load('<combat><e if="a">Test</e><event on="win"></event><event on="lose"></event></combat>')('combat');
      var expected = [{name: 'Test', tier: 1}];

      // Boolean
      let context = defaultQuestContext();
      context.scope.a = true;
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual(expected);

      // Non-zero
      context = defaultQuestContext();
      context.scope.a = 1;
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual(expected);
    });

    it('sets enemies programmatically', () => {
      var node = cheerio.load('<combat><e>{{a}}</e><event on="win"></event><event on="lose"></event></combat>')('combat');

      // Not defined
      let context = defaultQuestContext();
      expect(() => {loadCombatNode(node, context)}).toThrow();

      // String
      context = defaultQuestContext();
      context.scope.a = 'Skeleton Swordsman';
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual([{name: 'Skeleton Swordsman', tier: 2, class: 'Undead'}]);

      // Wrapped matrix
      context = defaultQuestContext();
      context.scope.a = ['Test'];
      var result = loadCombatNode(node, context);
      expect(result.enemies).toEqual([{name: 'Test', tier: 1}]);
    });
  });

  describe('getEventParameters', () => {
    it('gets parameters', () => {
      var node = cheerio.load('<combat><event on="win" heal="5" loot="false" xp="false"><roleplay></roleplay></event></combat>')('combat');
      expect(getEventParameters(node, 'win', defaultQuestContext())).toEqual({
        heal: 5, loot: false, xp: false
      });
    });

    it('safely handles event with no params', () => {
      var node = cheerio.load('<combat><event on="win"><roleplay></roleplay></event></combat>')('combat');
      expect(getEventParameters(node, 'win', defaultQuestContext())).toEqual({});
    });
  });

  describe('handleAction', () => {
    it('skips hidden triggers', () => {
      var node = cheerio.load('<roleplay><choice><trigger if="a">goto 5</trigger><trigger>end</trigger></choice></roleplay>')('roleplay');
      var result = handleAction(new ParserNode(node, defaultQuestContext()), 0);
      expect(result.elem.text()).toEqual('end');
    });

    it('uses enabled triggers', () => {
      var quest = cheerio.load('<quest><roleplay><choice><trigger if="a">goto 5</trigger><trigger>end</trigger><roleplay id="5">expected</roleplay><roleplay>wrong</roleplay></choice></roleplay></quest>')('quest');
      let ctx = defaultQuestContext();
      ctx.scope.a = true;
      var result = handleAction(new ParserNode(quest.children().eq(0), ctx), 0);
      expect(result.elem.text()).toEqual('expected');
    });

    
    /* TODO
    it('uses programmatic triggers', () => {
      var quest = cheerio.load('<quest><roleplay><p>{{dest=5}}</p><choice><trigger>goto {{dest}}</trigger><trigger>end</trigger><roleplay id="5">expected</roleplay><roleplay>wrong</roleplay></choice></roleplay></quest>')('quest');
      let ctx = defaultQuestContext();
      var result = handleAction(quest.children().eq(0), 0, ctx);
      expect(result.text()).toEqual('expected');
    })
    */

    it('can handle multiple gotos', () => {
      var quest = cheerio.load('<quest><roleplay><choice><trigger>goto 1</trigger><trigger id="1">goto 2</trigger><trigger id="2">end</trigger><roleplay>wrong</roleplay></choice></roleplay></quest>')('quest');
      var result = handleAction(new ParserNode(quest.children().eq(0), defaultQuestContext()), 0);
      expect(result.elem.text()).toEqual('end');
    })

    it('goes to correct choice', () => {
      var node = cheerio.load('<roleplay><choice></choice><choice><roleplay>herp</roleplay><roleplay>derp</roleplay></choice></roleplay>')('roleplay');
      var result = handleAction(new ParserNode(node, defaultQuestContext()), 1);
      expect(result.elem.text()).toEqual('herp');
    });

    it('goes to next roleplay node', () => {
      var node = cheerio.load('<roleplay id="rp1">rp1</roleplay><roleplay>rp2</roleplay>')('#rp1');
      var result = handleAction(new ParserNode(node, defaultQuestContext()), 1);
      expect(result.elem.text()).toEqual('rp2');
    });

    it('goes to correct event', () => {
      var node = cheerio.load('<roleplay><event></event><event on="test"><roleplay>herp</roleplay><roleplay>derp</roleplay></event></roleplay>')('roleplay');
      var result = handleAction(new ParserNode(node, defaultQuestContext()), 'test');
      expect(result.elem.text()).toEqual('herp');
    });

    it('immediately follows triggers on otherwise empty choices', () => {
      var rootNode = cheerio.load('<quest></quest>')('quest');
      var choiceNode = cheerio.load('<roleplay><choice><trigger>goto jump</trigger></choice></roleplay>')('roleplay');
      var jumpNode = cheerio.load('<roleplay id="jump">Jumped</roleplay>')('roleplay');

      rootNode.append(choiceNode);
      rootNode.append(jumpNode);

      var result = handleAction(new ParserNode(choiceNode, defaultQuestContext()), 0);
      expect(result.elem.text()).toEqual('Jumped');
    });

    it('does not immediately follow triggers on non-empty choices', () => {
      var node = cheerio.load('<roleplay><choice><roleplay>Not empty</roleplay><trigger>goto jump</trigger></choice></roleplay><roleplay id="jump">Hello</roleplay>')('roleplay');
      var result = handleAction(new ParserNode(node, defaultQuestContext()), 0);
      expect(result.elem.text()).toEqual('Not empty');
    });
  });
});