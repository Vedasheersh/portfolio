---
title: "The Shifting Landscape of Computational Protein Design"
description: "Reflections on how generative models and deep learning have reshaped structural biology, and what it means to build at the intersection of ML and protein engineering."
date: "2026-03-22"
og_image: "portrait1.jpg"
---

A few years ago, the tools we had for computational protein design were powerful but slow. Rosetta could redesign side chains and optimize energy functions, but exploring large sequence-structure spaces required weeks of compute and careful human curation. Molecular dynamics could validate a design, but the turnaround from hypothesis to confidence was measured in months.

That world has changed.

## The generative turn

RFDiffusion, ProteinMPNN, and the broader family of structure-generation and inverse-folding models have fundamentally altered what it means to "design" a protein. Where we once started from a known scaffold and perturbed it, we can now generate backbones from scratch conditioned on functional constraints. The design space went from combinatorial to generative, and the implications are still unfolding.

At Amgen, I ran a full de novo binder design campaign using these tools. The pipeline went from target structure to designed sequences to AlphaFold2 validation to experimental candidates in a matter of weeks, not months. The bottleneck shifted from computation to experimental throughput, which is exactly where you want it.

## What protein language models actually give us

ESM and its successors have become indispensable, but I think the field sometimes oversells what they provide. Protein language models are excellent at capturing evolutionary plausibility. They encode what nature has already explored. But they are not physics engines. They do not simulate folding. They do not predict binding affinity with the precision of a well-parameterized free energy calculation.

Where they shine is in featurization. In CatPred, we leveraged protein language model embeddings as input features for predicting enzyme kinetic parameters. The PLM captures sequence context that hand-crafted features miss, and combining that with substrate representations gave us a 40% improvement in turnover number prediction. The key insight was not that the PLM "understands" catalysis, but that it provides a rich, transferable representation of protein sequence space that downstream models can learn from.

## The simulation question

I still believe molecular dynamics has a critical role in this new landscape, but it has to be deployed differently. Running a 100-nanosecond simulation of every candidate in a library of 30,000 designed binders is not feasible. But using MD to validate the top 50 candidates, to check for structural stability, to identify problematic flexible loops, to confirm that a binding interface is stable under thermal fluctuation: that remains irreplaceable.

During my PhD, we ran large-scale MD campaigns on SARS-CoV-2 spike-ACE2 complexes, generating terabytes of trajectory data. The computational cost was enormous, but the biophysical insights were things no ML model could have provided at the time. The binding free energy decomposition, the identification of key interfacial water molecules, the characterization of conformational dynamics at the mutation sites: these required explicit-solvent, all-atom simulation.

The practical question is how to integrate MD into modern design pipelines without it becoming the bottleneck. My current thinking is that MD serves best as a filter, not a generator. Generate with RFDiffusion, score with ProteinMPNN and AF2, then validate the survivors with targeted MD. This tiered approach respects both the throughput of ML and the fidelity of physics.

## Building for production

One thing I have learned moving from academia to industry is that a model is only as valuable as its deployment. CatPred works as a research tool, but deploying protein design pipelines in a production environment at a biotech company requires infrastructure thinking: GPU allocation, job scheduling, result tracking, version control for model weights.

At Arcellx, a significant part of my work is building these systems. Not just the ML models themselves, but the agentic pipelines that take a design brief, run the appropriate tools, and return ranked candidates with confidence estimates. The gap between "this works in a Jupyter notebook" and "this runs reliably at scale" is where most computational biology efforts stall.

## Looking ahead

The next few years will be defined by integration. The individual tools, generative backbone design, inverse folding, structure prediction, language model scoring, molecular dynamics, are all maturing. The challenge is composing them into end-to-end workflows that are reliable, interpretable, and fast enough to keep pace with experimental iteration.

I am particularly interested in how we close the loop between computation and experiment. The best designs are worthless without experimental validation, and the best experimental data is underutilized without computational models that can learn from it. Building that feedback loop, at the interface of ML infrastructure, protein biophysics, and wet-lab collaboration, is where I think the most impactful work will happen.
