import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([]), AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders at least one <inandu-grid>', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('inandu-grid')).toBeTruthy();
  });

  it('opens on the overview tab and switches panels without unmounting the grids', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const overview = compiled.querySelector<HTMLElement>('#panel-overview')!;
    const tree = compiled.querySelector<HTMLElement>('#panel-tree')!;

    expect(fixture.componentInstance.activeTab()).toBe('overview');
    expect(overview.hidden).toBe(false);
    expect(tree.hidden).toBe(true);

    compiled.querySelector<HTMLButtonElement>('#tab-tree')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('tree');
    expect(overview.hidden).toBe(true);
    expect(tree.hidden).toBe(false);
    // Both panels are still in the DOM — switching tabs must not re-render a grid from scratch.
    expect(compiled.querySelector('#customers-grid')).toBeTruthy();
    expect(compiled.querySelector('#tree-grid')).toBeTruthy();
  });
});
