import { GraphSnapshot } from '../../../../../src/GraphSnapshot';
import { NodeId } from '../../../../../src/schema';
import { createBaselineEditedSnapshot, createUpdateEditedSnapshot } from '../../../../helpers';

// These are really more like integration tests, given the underlying machinery.
//
// It just isn't very fruitful to unit test the individual steps of the write
// workflow in isolation, given the contextual state that must be passed around.
describe(`operations.write`, () => {
  describe(`edit cyclic graph`, () => {

    let snapshot: GraphSnapshot, editedNodeIds: Set<NodeId>;
    beforeAll(() => {
      const cyclicRefQuery = {
        gqlString: `{
          foo {
            id
            name
            bar {
              id
              name
              fizz { id }
              buzz { id }
            }
          }
        }`,
      };

      const baseline = createBaselineEditedSnapshot(
        cyclicRefQuery,
        {
          foo: {
            id: 1,
            name: 'Foo',
            bar: {
              id: 2,
              name: 'Bar',
              fizz: { id: 1 },
              buzz: { id: 2 },
            },
          },
        }
      ).snapshot;

      const result = createUpdateEditedSnapshot(
        baseline,
        cyclicRefQuery,
        {
          foo: {
            id: 1,
            name: 'Foo',
            bar: {
              id: 2,
              name: 'Barrington',
              fizz: { id: 1 },
              buzz: { id: 2 },
            },
          },
        }
      );
      snapshot = result.snapshot;
      editedNodeIds = result.editedNodeIds;
    });

    it(`fixes all references to the edited node`, () => {
      const foo = snapshot.getNodeData('1');
      const bar = snapshot.getNodeData('2');

      expect(foo.id).to.eq(1);
      expect(foo.name).to.eq('Foo');
      expect(foo.bar).to.eq(bar);

      expect(bar.id).to.eq(2);
      expect(bar.name).to.eq('Barrington');
      expect(bar.fizz).to.eq(foo);
      expect(bar.buzz).to.eq(bar);
    });

    it(`only marks the edited node`, () => {
      expect(Array.from(editedNodeIds)).to.have.members(['2']);
    });
  });
});
